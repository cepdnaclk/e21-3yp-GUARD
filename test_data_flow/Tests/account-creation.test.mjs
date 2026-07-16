import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildFallbackEmail,
  createUser,
  ensureUniqueUser,
} from '../../code/backend/src/controllers/auth/createUserHelper.js';
import { AppError } from '../../code/backend/src/lib/AppError.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function createDeps({
  findFirstResult = null,
  findFirstError = null,
  createResult = {
    id: 'user-1',
    username: 'alice',
    email: 'alice@example.com',
  },
  createError = null,
  hashImpl = async (password) => `hashed:${password}`,
  sendVerificationEmailImpl = async () => undefined,
  now = () => 1_700_000_000_000,
  random = () => 0.123456,
} = {}) {
  const calls = {
    findFirst: [],
    create: [],
    hash: [],
    sendVerificationEmail: [],
  };

  const deps = {
    prisma: {
      user: {
        findFirst: async (query) => {
          calls.findFirst.push(query);
          if (findFirstError) {
            throw findFirstError;
          }
          return findFirstResult;
        },
        create: async (query) => {
          calls.create.push(query);
          if (createError) {
            throw createError;
          }
          return createResult;
        },
      },
    },
    bcrypt: {
      hash: async (password, rounds) => {
        calls.hash.push([password, rounds]);
        return hashImpl(password, rounds);
      },
    },
    sendVerificationEmail: async (...args) => {
      calls.sendVerificationEmail.push(args);
      return sendVerificationEmailImpl(...args);
    },
    now,
    random,
  };

  return { deps, calls };
}

function expectAppError(expectedMessage, expectedStatus) {
  return (err) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.message, expectedMessage);
    assert.equal(err.statusCode, expectedStatus);
    return true;
  };
}

test('buildFallbackEmail returns the exact local.guard fallback address', () => {
  assert.equal(buildFallbackEmail('system_admin'), 'system_admin@local.guard');
});

test('ensureUniqueUser allows unique values and ignores whitespace-only phone numbers', async () => {
  const { deps, calls } = createDeps();

  await ensureUniqueUser('alice', 'alice@example.com', '   ', deps);

  assert.equal(calls.findFirst.length, 1);
  assert.deepEqual(calls.findFirst[0], {
    where: {
      OR: [
        { username: 'alice' },
        { email: 'alice@example.com' },
      ],
    },
  });
});

test('ensureUniqueUser trims the phone number before checking for conflicts', async () => {
  const { deps, calls } = createDeps({
    findFirstResult: {
      username: 'someone_else',
      email: 'other@example.com',
      phoneNumber: '0777000111',
    },
  });

  await assert.rejects(
    () => ensureUniqueUser('alice', 'alice@example.com', ' 0777000111 ', deps),
    expectAppError('This phone number is already registered.', 409),
  );

  assert.equal(calls.findFirst.length, 1);
  assert.deepEqual(calls.findFirst[0].where.OR, [
    { username: 'alice' },
    { email: 'alice@example.com' },
    { phoneNumber: '0777000111' },
  ]);
});

test('ensureUniqueUser rejects duplicate username conflicts', async () => {
  const { deps } = createDeps({
    findFirstResult: {
      username: 'alice',
      email: 'other@example.com',
      phoneNumber: '0777000111',
    },
  });

  await assert.rejects(
    () => ensureUniqueUser('alice', 'alice@example.com', '0777000999', deps),
    expectAppError('This username is already taken.', 409),
  );
});

test('ensureUniqueUser rejects duplicate email conflicts', async () => {
  const { deps } = createDeps({
    findFirstResult: {
      username: 'someone_else',
      email: 'alice@example.com',
      phoneNumber: '0777000111',
    },
  });

  await assert.rejects(
    () => ensureUniqueUser('alice', 'alice@example.com', '0777000999', deps),
    expectAppError('This email address is already registered.', 409),
  );
});

test('ensureUniqueUser propagates Prisma failures', async () => {
  const prismaError = new Error('database connection dropped');
  const { deps } = createDeps({ findFirstError: prismaError });

  await assert.rejects(
    () => ensureUniqueUser('alice', 'alice@example.com', '0777000111', deps),
    (err) => err === prismaError,
  );
});

test('createUser uses the fallback email path when no real email is supplied', async () => {
  const { deps, calls } = createDeps();

  const result = await createUser(
    {
      username: 'alice',
      email: undefined,
      password: 'Password123',
      fullName: 'Alice Example',
      role: 'USER',
      address: 'Main Street',
      phoneNumber: '0777000111',
    },
    deps,
  );

  assert.equal(calls.findFirst.length, 1);
  assert.equal(calls.hash.length, 1);
  assert.equal(calls.create.length, 1);
  assert.equal(calls.sendVerificationEmail.length, 0);

  assert.deepEqual(calls.create[0].data.email, 'alice@local.guard');
  assert.equal(calls.create[0].data.emailVerified, true);
  assert.equal(calls.create[0].data.verificationToken, null);
  assert.equal(calls.create[0].data.verificationTokenExpiry, null);

  assert.equal(result.isRealEmail, false);
  assert.deepEqual(result.user, {
    id: 'user-1',
    username: 'alice',
    email: 'alice@example.com',
  });
});

for (const offsetMs of [-1000, 0, 1000]) {
  test(`createUser generates verification expiry exactly 24h ahead when the clock is offset by ${offsetMs}ms`, async () => {
    const baseNow = 1_700_000_000_000;
    const { deps, calls } = createDeps({
      now: () => baseNow + offsetMs,
    });

    const result = await createUser(
      {
        username: 'alice',
        email: 'alice@example.com',
        password: 'Password123',
        fullName: 'Alice Example',
        role: 'USER',
        address: 'Main Street',
        phoneNumber: '0777000111',
      },
      deps,
    );

    assert.equal(result.isRealEmail, true);
    assert.equal(calls.sendVerificationEmail.length, 1);
    assert.equal(calls.create[0].data.verificationTokenExpiry.getTime(), baseNow + offsetMs + DAY_MS);
    assert.equal(calls.create[0].data.verificationToken, '211110');
    assert.equal(calls.sendVerificationEmail[0][0], 'alice@example.com');
    assert.equal(calls.sendVerificationEmail[0][1], 'Alice Example');
    assert.equal(calls.sendVerificationEmail[0][2], '211110');
  });
}

test('createUser tolerates verification email failures without blocking account creation', async () => {
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    const { deps, calls } = createDeps({
      sendVerificationEmailImpl: async () => {
        throw new Error('smtp unavailable');
      },
    });

    const result = await createUser(
      {
        username: 'alice',
        email: 'alice@example.com',
        password: 'Password123',
        fullName: 'Alice Example',
        role: 'USER',
        address: 'Main Street',
        phoneNumber: '0777000111',
      },
      deps,
    );

    assert.equal(result.isRealEmail, true);
    assert.equal(calls.create.length, 1);
    assert.equal(calls.sendVerificationEmail.length, 1);
    assert.equal(calls.create[0].data.emailVerified, false);
    assert.equal(calls.create[0].data.verificationToken, '211110');
  } finally {
    console.error = originalConsoleError;
  }
});

for (const password of ['', null, undefined]) {
  test(`createUser rejects invalid password input: ${String(password)}`, async () => {
    const passwordError = new TypeError('password must be a non-empty string');
    const { deps, calls } = createDeps({
      hashImpl: async (value) => {
        if (!value) {
          throw passwordError;
        }
        return `hashed:${value}`;
      },
    });

    await assert.rejects(
      () => createUser(
        {
          username: 'alice',
          email: 'alice@example.com',
          password,
          fullName: 'Alice Example',
          role: 'USER',
          address: 'Main Street',
          phoneNumber: '0777000111',
        },
        deps,
      ),
      (err) => err === passwordError,
    );

    assert.equal(calls.hash.length, 1);
    assert.equal(calls.create.length, 0);
    assert.equal(calls.sendVerificationEmail.length, 0);
  });
}

test('createUser propagates duplicate insert failures from the database', async () => {
  const duplicateError = new Error('duplicate key error');
  const { deps, calls } = createDeps({ createError: duplicateError });

  await assert.rejects(
    () => createUser(
      {
        username: 'alice',
        email: 'alice@example.com',
        password: 'Password123',
        fullName: 'Alice Example',
        role: 'USER',
        address: 'Main Street',
        phoneNumber: '0777000111',
      },
      deps,
    ),
    (err) => err === duplicateError,
  );

  assert.equal(calls.create.length, 1);
  assert.equal(calls.sendVerificationEmail.length, 0);
});

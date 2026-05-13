// Barrel re-export — keeps authRoutes.js imports unchanged
export { login, googleLogin } from "./loginController.js";
export { register, createAdminBySuperAdmin, createUserByAdmin } from "./registerController.js";
export { verifyEmail, resendVerificationEmail } from "./verificationController.js";
export {
  forgotPasswordInit,
  forgotPasswordVerifyEmail,
  forgotPasswordVerifyCode,
  forgotPasswordReset,
} from "./passwordController.js";
export {
  getMe,
  getWorkersByAdmin,
  getUsersByAdmin,
  getAdminsBySuperAdmin,
  deleteAdminBySuperAdmin,
  deleteUserByAdmin,
  updateProfile,
} from "./userController.js";

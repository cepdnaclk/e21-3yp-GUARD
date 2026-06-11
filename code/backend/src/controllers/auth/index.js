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
  updateMe,
  getWorkersByAdmin,
  getUsersByAdmin,
  getAdminsBySuperAdmin,
  deleteAdminBySuperAdmin,
  deleteUserByAdmin,
  updateProfile,
  upload,
  uploadProfilePicture,
  deleteProfilePicture,
  sendEmailOtp,
  confirmEmailOtp,
  sendPhoneOtp,
  confirmPhoneOtp,
} from "./userController.js";

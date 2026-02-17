import nodemailer from "nodemailer";

/* =========================================
   TRANSPORTER
========================================= */

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_PASSWORD,
  },
});

/* =========================================
   BASE TEMPLATE WRAPPER
========================================= */

const baseTemplate = (content) => `
  <div style="max-width:600px;margin:0 auto;padding:30px;background:#f9fafb;border-radius:12px;font-family:Arial">
    
    <div style="text-align:center;margin-bottom:20px;">
      <h2 style="color:#111827;margin:0;">SkillSpring 🎓</h2>
      <p style="color:#6b7280;font-size:14px;margin:5px 0;">
        Learn Without Limits. Teach Without Barriers.
      </p>
    </div>

    ${content}

    <hr style="margin:30px 0;border:none;border-top:1px solid #e5e7eb;" />

    <p style="text-align:center;font-size:12px;color:#9ca3af;">
      © ${new Date().getFullYear()} SkillSpring. All rights reserved.
    </p>

  </div>
`;

/* =========================================
   EMAIL VERIFICATION
========================================= */

export const sendVerificationEmail = async ({
  email,
  username,
  verifyCode,
}) => {
  try {
    const verifyUrl = `${process.env.CLIENT_URL}/auth/verify/${username}?otp=${verifyCode}`;

    const content = `
      <p>Hello <strong>${username}</strong>,</p>

      <p>Thanks for signing up! Please verify your email using the code below:</p>

      <div style="text-align:center;margin:20px 0;">
        <span style="font-size:28px;font-weight:bold;background:#eef2ff;padding:12px 24px;border-radius:8px;color:#4338ca;">
          ${verifyCode}
        </span>
      </div>

      <div style="text-align:center;">
        <a href="${verifyUrl}" 
           style="background:#4f46e5;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">
          Verify Email
        </a>
      </div>
    `;

    return await transporter.sendMail({
      from: `"SkillSpring" <${process.env.NODEMAILER_USER}>`,
      to: email,
      subject: "Verify Your Email - SkillSpring",
      html: baseTemplate(content),
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

/* =========================================
   WELCOME EMAIL
========================================= */

export const sendWelcomeEmail = async ({ email, username }) => {
  try {
    const content = `
      <p>Hello <strong>${username}</strong>,</p>

      <p>Welcome to SkillSpring! 🚀</p>

      <ul>
        <li>Browse trending courses</li>
        <li>Track learning progress</li>
        <li>Review & rate courses</li>
        <li>Become a teacher anytime</li>
      </ul>

      <div style="text-align:center;margin-top:20px;">
        <a href="${process.env.CLIENT_URL}" 
           style="background:#4f46e5;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">
          Explore Courses
        </a>
      </div>
    `;

    return await transporter.sendMail({
      from: `"SkillSpring" <${process.env.NODEMAILER_USER}>`,
      to: email,
      subject: "Welcome to SkillSpring 🎉",
      html: baseTemplate(content),
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

/* =========================================
   WELCOME BACK EMAIL
========================================= */

export const sendWelcomeBackEmail = async ({ email, username }) => {
  try {
    const content = `
      <p>Hello <strong>${username}</strong>,</p>

      <p>We’re excited to see you back on SkillSpring!</p>

      <div style="text-align:center;margin-top:20px;">
        <a href="${process.env.CLIENT_URL}" 
           style="background:#10b981;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">
          Continue Learning
        </a>
      </div>
    `;

    return await transporter.sendMail({
      from: `"SkillSpring" <${process.env.NODEMAILER_USER}>`,
      to: email,
      subject: "Welcome Back to SkillSpring 🎓",
      html: baseTemplate(content),
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

/* =========================================
   RESET PASSWORD EMAIL
========================================= */

export const sendResetEmail = async ({
  email,
  username,
  resetToken,
}) => {
  try {
    const resetUrl = `${process.env.CLIENT_URL}/auth/reset-password?token=${resetToken}`;

    const content = `
      <p>Hello <strong>${username}</strong>,</p>

      <p>We received a request to reset your password.</p>

      <div style="text-align:center;margin-top:20px;">
        <a href="${resetUrl}" 
           style="background:#dc2626;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">
          Reset Password
        </a>
      </div>

      <p style="font-size:12px;color:#6b7280;">
        If you didn’t request this, you can safely ignore this email.
      </p>
    `;

    return await transporter.sendMail({
      from: `"SkillSpring" <${process.env.NODEMAILER_USER}>`,
      to: email,
      subject: "Reset Your Password - SkillSpring",
      html: baseTemplate(content),
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

/* =========================================
   COURSE ENROLLMENT CONFIRMATION
========================================= */

export const sendPurchaseConfirmation = async ({
  email,
  username,
  courseName,
  course_id,
}) => {
  try {
    const courseUrl = `${process.env.CLIENT_URL}/courses/${course_id}`;

    const content = `
      <p>Hello <strong>${username}</strong>,</p>

      <p>You have successfully enrolled in:</p>

      <div style="background:#eef2ff;padding:15px;border-radius:8px;text-align:center;margin:20px 0;">
        <strong>${courseName}</strong>
      </div>

      <div style="text-align:center;">
        <a href="${courseUrl}" 
           style="background:#4f46e5;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">
          Start Learning
        </a>
      </div>
    `;

    return await transporter.sendMail({
      from: `"SkillSpring" <${process.env.NODEMAILER_USER}>`,
      to: email,
      subject: `You're Enrolled in ${courseName} 🎓`,
      html: baseTemplate(content),
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

/* =========================================
   COURSE APPROVED (ADMIN → TEACHER)
========================================= */

export const sendCourseApprovedEmail = async ({
  email,
  username,
  courseName,
}) => {
  try {
    const content = `
      <p>Hello <strong>${username}</strong>,</p>

      <p>Great news! 🎉</p>

      <p>Your course <strong>${courseName}</strong> has been approved by our admin team and is now live on SkillSpring.</p>

      <div style="text-align:center;margin-top:20px;">
        <a href="${process.env.CLIENT_URL}/teacher/dashboard" 
           style="background:#16a34a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">
          View Dashboard
        </a>
      </div>
    `;

    return await transporter.sendMail({
      from: `"SkillSpring" <${process.env.NODEMAILER_USER}>`,
      to: email,
      subject: "Your Course Has Been Approved 🎉",
      html: baseTemplate(content),
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

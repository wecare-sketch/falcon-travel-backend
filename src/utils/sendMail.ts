import sgMail from "../config/mailer";


export async function sendInvite(host: string, hostInviteUrl: string) {
  try {
    await sgMail.send({
      to: host,
      from: `${process.env.SENDER_EMAIL}`,
      subject: "You're invited to host an event",
      html: `<p>You’ve been invited as a host. Click <a href="${hostInviteUrl}">here</a> to sign up.</p>`,
    });
  } catch (error) {
    console.error(`Failed to send invite to ${host}:`, error);
    throw new Error("Failed to send invite email");
  }
}

export async function sendOTPMail(email: string, otp: string) {
  try {
    await sgMail.send({
      to: email,
      from: `${process.env.SENDER_EMAIL}`,
      subject: "You just requested a password reset",
      html: `Your Password Reset OTP is: ${otp}`,
    });
  } catch (error) {
    console.error(`Failed to send invite to ${email}:`, error);
    throw new Error("Failed to send invite email");
  }
}

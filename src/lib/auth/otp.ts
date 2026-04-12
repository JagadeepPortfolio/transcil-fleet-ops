/**
 * Phone OTP abstraction.
 *
 * Build phase: email/password via Supabase Auth; this module is a stub.
 * Production: MSG91 impl swapped in by replacing this file only. No
 * component churn because call sites only know about sendOtp/verifyOtp.
 */

export interface OtpProvider {
  /** Send a 6-digit OTP to the given 10-digit Indian phone number. */
  sendOtp(phone: string): Promise<{ requestId: string }>
  /** Verify the code for the given phone. Resolves on success, throws on failure. */
  verifyOtp(phone: string, code: string, requestId: string): Promise<void>
}

class StubOtpProvider implements OtpProvider {
  async sendOtp(phone: string) {
    if (process.env.APP_ENV === "production") {
      throw new Error(
        "OTP provider not configured for production. Wire MSG91 in lib/auth/otp.ts."
      )
    }
    // eslint-disable-next-line no-console
    console.info(`[otp stub] would send OTP to ${phone}`)
    return { requestId: `stub-${Date.now()}` }
  }

  async verifyOtp(phone: string, code: string, requestId: string) {
    if (process.env.APP_ENV === "production") {
      throw new Error("OTP provider not configured for production.")
    }
    // Accept any 6-digit code in dev.
    if (!/^\d{6}$/.test(code)) {
      throw new Error("Invalid code")
    }
    // eslint-disable-next-line no-console
    console.info(`[otp stub] verified ${phone} (req ${requestId})`)
  }
}

export const otpProvider: OtpProvider = new StubOtpProvider()

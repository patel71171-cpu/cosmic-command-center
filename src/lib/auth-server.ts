import { createServerFn } from "@tanstack/react-start";

export const verifyGoogleToken = createServerFn({ method: 'POST' })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${data.token}` },
      });

      if (!response.ok) {
        throw new Error("Invalid Google token");
      }

      const user = await response.json();
      
      // In a real application, you would create a secure HTTP-only cookie here
      // to establish the user's session.
      
      return { success: true, user };
    } catch (error: any) {
      console.error("Token verification failed:", error);
      return { success: false, error: error.message };
    }
  });
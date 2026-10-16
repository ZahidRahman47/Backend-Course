import { z } from "zod";

//lowercase so "Zahid@Mail.com" and "zahid@mail.com" are the same account.
const email = z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email."));

export const registerSchema = z.object({
    body: z.strictObject({
        name: z.string().trim().min(2, "Name must be at least 2 characters.").max(50),
        email,
        password: z
            .string()
            .min(8, "Password must be at least 8 characters.")
            //bcrypt only uses the first 72 bytes of a password.
            .max(72, "Password must be at most 72 characters.")
            .regex(/[a-z]/, "Password needs a lowercase letter.")
            .regex(/[A-Z]/, "Password needs an uppercase letter.")
            .regex(/[0-9]/, "Password needs a number."),
    }),
});

//login only checks the shape. password rules are not repeated here, otherwise
//the error would tell an attacker which rules a valid password follows.
export const loginSchema = z.object({
    body: z.strictObject({
        email,
        password: z.string().min(1, "Password is required.").max(72),
    }),
});

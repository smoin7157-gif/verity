import { z } from "zod";

const phonePattern = /^\+?[\d\s()-]{7,25}$/;

export const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(100, "Full name is too long."),
  college: z
    .string()
    .trim()
    .min(2, "Enter your college.")
    .max(120, "College name is too long."),
  branch: z
    .string()
    .trim()
    .min(2, "Enter your branch.")
    .max(80, "Branch is too long."),
  year_of_study: z.coerce
    .number()
    .int()
    .min(1, "Select your year of study.")
    .max(6, "Select a valid year."),
  phone: z
    .string()
    .trim()
    .regex(phonePattern, "Enter a valid phone number.")
    .refine(
      (value) => (value.match(/\d/g) ?? []).length >= 7,
      "Enter a valid phone number.",
    ),
  skills: z
    .array(z.string().trim().min(1).max(40))
    .min(1, "Add at least one skill.")
    .max(20, "Add up to 20 skills."),
  linkedin_url: z
    .string()
    .trim()
    .max(200, "LinkedIn URL is too long.")
    .refine(
      (value) => value === "" || URL.canParse(value),
      "Enter a valid LinkedIn URL.",
    ),
  bio: z
    .string()
    .trim()
    .min(1, "Write a short bio.")
    .max(300, "Bio must be 300 characters or fewer."),
});

export type ProfileInput = Omit<
  z.infer<typeof profileSchema>,
  "linkedin_url"
> & {
  linkedin_url: string | null;
};

type ParseResult =
  | { success: true; data: ProfileInput }
  | { success: false; error: string };

/** Validates the profile form and normalises optional values. */
export function parseProfileForm(formData: FormData): ParseResult {
  const skills = Array.from(
    new Set(
      formData
        .getAll("skills")
        .map((skill) => String(skill).trim())
        .filter(Boolean),
    ),
  );

  const result = profileSchema.safeParse({
    full_name: formData.get("full_name") ?? "",
    college: formData.get("college") ?? "",
    branch: formData.get("branch") ?? "",
    year_of_study: formData.get("year_of_study") ?? "",
    phone: formData.get("phone") ?? "",
    skills,
    linkedin_url: formData.get("linkedin_url") ?? "",
    bio: formData.get("bio") ?? "",
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message ?? "Please check the form.",
    };
  }

  return {
    success: true,
    data: {
      ...result.data,
      linkedin_url: result.data.linkedin_url || null,
    },
  };
}

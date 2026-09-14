import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { ValidationError } from "@/lib/errors/app-error";
import { listMyMedia, uploadMedia } from "@/features/media/services/media.service";

export const GET = withApiHandler(async () => {
  const user = await requireCurrentUser();
  const items = await listMyMedia(user);
  return apiSuccess(items);
});

export const POST = withApiHandler(async (req: Request) => {
  const user = await requireCurrentUser();
  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new ValidationError("A file field is required");
  }
  const media = await uploadMedia(user, file);
  return apiSuccess(media, { status: 201 });
});

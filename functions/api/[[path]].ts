import { handleApiRequest } from "../../worker/router";
import type { Env } from "../../worker/types";

export const onRequest: PagesFunction<Env> = async (context) => {
  return handleApiRequest(context.request, context.env);
};

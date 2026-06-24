import { handleApiRequest } from "./router";
import { RoomDurableObject } from "./roomDurableObject";
import type { Env } from "./types";

export { RoomDurableObject };

export default {
  fetch(request: Request, env: Env) {
    return handleApiRequest(request, env);
  },
} satisfies ExportedHandler<Env>;


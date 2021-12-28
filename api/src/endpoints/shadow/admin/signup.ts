import { FastifyInstance } from "fastify";
import { APIError } from "../../../api";
import { prisma } from "../../../utils/prisma";

export default function ShadowAdminList(fastify: FastifyInstance) {
  fastify.post<{
    Params: {
      group: string;
      game_id: string;
    };
    Body: {
      username: string;
      properties: any;
    };
  }>("/shadow/admin/:group/:game_id/signup", async (request, reply) => {
    const player = await prisma.player.findFirst({
      where: {
        username: {
          equals: request.body.username,
          mode: "insensitive"
        },
      },
    });
    if (!player) {
      throw APIError.InvalidRequest("Could not find a user with this username. Please check the input and try again.");
    }
    const { group_id } = await prisma.shadow_clan_group.findUnique({
      where: {
        group_text_id: request.params.group,
      },
      select: {
        group_id: true,
      },
    }) ?? {};
    if (group_id === undefined) {
      throw APIError.InvalidRequest("Invalid group");
    }
    await prisma.shadow_player.upsert({
      where: {
        user_id_game_id: {
          game_id: Number(request.params.game_id),
          user_id: player.user_id,
        },
      },
      create: {
        group_id,
        game_id: Number(request.params.game_id),
        user_id: player.user_id,
      },
      update: {
        group_id,
        clan_id: null,
      },
    });
    await prisma.shadow_player_properties.upsert({
      where: {
        user_id_group_id_game_id: {
          user_id: player.user_id,
          group_id: group_id,
          game_id: Number(request.params.game_id),
        },
      },
      create: {
        user_id: player.user_id,
        game_id: Number(request.params.game_id),
        group_id,
        properties: request.body.properties
      },
      update: {
        properties: request.body.properties
      }
    });
    return true;
  });
}

import * as parser from 'luaparse';
import * as lua from '../../util/lua';
import { GuildMember } from '../../entities/guild_member';

const defaultOptions = {
  comments: false
};

function stringify(obj: Object) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch(e) {
     return `${obj}`;
  }
}

function parseGuildMembersList(root: parser.Chunk, guildies: Object[], errors: string[]) {
  const assignment = lua.getAssignment(root, 'VanguardGuild', errors);
  if(!assignment) {
    errors.push('Could not find assignment for variable: VanguardGuild');
    return;
  }
  const rawList = lua.findTable(assignment.init, errors);
  if(!rawList) {
    errors.push('Cannot find TableConstructorExpression from "VanguardGuild" assignment');
    return;
  }
  const guildMemberList = lua.getList(rawList, errors);

  if(guildMemberList) {
    if(guildMemberList.every(it => lua.isTableConstructorExpression(it.value))) {
      const parsedGuildMembers = guildMemberList.map(field => {
        const guildMemberDict = lua.getDict(field.value as parser.TableConstructorExpression, errors);

        const name = lua.getDictValue(guildMemberDict, 'name', errors);
        const officer_note = lua.getDictValue(guildMemberDict, 'officernote', errors);
        const player_class = lua.getDictValue(guildMemberDict, 'class', errors);
        const level = lua.getDictValue(guildMemberDict, 'level', errors);
        const rank_index = lua.getDictValue(guildMemberDict, 'rankindex', errors);
        const rank = lua.getDictValue(guildMemberDict, 'rank', errors);

        if(
          lua.isStringLiteral(name) &&
          lua.isStringLiteral(officer_note) &&
          lua.isStringLiteral(player_class) &&
          lua.isNumericLiteral(level) &&
          lua.isNumericLiteral(rank_index) &&
          lua.isStringLiteral(rank)
        ) {
          return {
            player_name: name.value,
            officer_note: officer_note.value,
            class: player_class.value,
            level: level.value,
            rank_index: rank_index.value,
            rank: rank.value
          }
        } else {
          errors.push(`Invalid guild member format: ${JSON.stringify(guildMemberDict)}`);
        }
      });

      guildies.push(...parsedGuildMembers);
    } else {
      errors.push(`Invalid guild member list - all items must be a TableConstructorExpression`);
    }
  } else {
    errors.push(`Could not find guild member dict: ${rawList}`);
  }
}

// Expects a Lua script with an assignment to a variable called "VanguardGuild"
// Converts whatever is assigned there into a structure for internal consumption
export function parseGuildMembers(raidDB): { result: GuildMember[], errors: string[], exception?: Error } {
  try {
    const ast = parser.parse(raidDB, defaultOptions);
    // console.log(JSON.stringify(ast));
    const errors = [];
    const guildies = [];

    parseGuildMembersList(ast, guildies, errors);

    console.info('Processed guild members', {
      count: guildies.length,
      errors: JSON.stringify(errors)
    });

    return {
      result: guildies,
      errors
    }
  } catch(e) {
    return {
      result: null,
      errors: [e.message],
      exception: e
    }
  }
}

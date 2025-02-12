import { CustomCommand, SlashCommand, SlashCommandDescription } from "../";
import { stripImages } from "../llm/images";
import { renderTemplatedString } from "../promptFiles/v1/renderTemplatedString";
import { functionSearch } from "./customFunction/functionSearch";
import SlashCommands from "./slash";

export function slashFromCustomCommand(
  customCommand: CustomCommand,
): SlashCommand {
  return {
    name: customCommand.name,
    description: customCommand.description,
    run: async function* ({ input, llm, history, ide, selectedCode }) {
      // Remove slash command prefix from input
      let userInput = input;
      if (userInput.startsWith(`/${customCommand.name}`)) {
        userInput = userInput
          .slice(customCommand.name.length + 1, userInput.length)
          .trimStart();
      }

      // search function name and add the context in the given code
      try {
        userInput = await functionSearch(userInput, selectedCode);
      } catch (error) {
        console.error("Error in functionSearch:", error);
        return;
      }

      // Render prompt template
      // const promptUserInput = await renderTemplatedString(
      //   customCommand.prompt,
      //   ide.readFile.bind(ide),
      //   { input: userInput },
      // );
      const promptUserInput = `${userInput} Write a comprehensive set of unit tests for the selected code`;

      const messages = [...history];
      // Find the last chat message with this slash command and replace it with the user input
      for (let i = messages.length - 1; i >= 0; i--) {
        const { role, content } = messages[i];
        if (role !== "user") {
          continue;
        }

        if (
          Array.isArray(content) &&
          content.some((part) =>
            part.text?.startsWith(`/${customCommand.name}`),
          )
        ) {
          messages[i] = {
            ...messages[i],
            content: content.map((part) => {
              return part.text?.startsWith(`/${customCommand.name}`)
                ? { ...part, text: promptUserInput }
                : part;
            }),
          };
          break;
        } else if (
          typeof content === "string" &&
          content.startsWith(`/${customCommand.name}`)
        ) {
          messages[i] = { ...messages[i], content: promptUserInput };
          break;
        }
      }

      for await (const chunk of llm.streamChat(messages, new AbortController().signal)) {
        yield stripImages(chunk.content);
      }
    },
  };
}

export function slashCommandFromDescription(
  desc: SlashCommandDescription,
): SlashCommand | undefined {
  const cmd = SlashCommands.find((cmd) => cmd.name === desc.name);
  if (!cmd) {
    return undefined;
  }
  return {
    ...cmd,
    params: desc.params,
    description: desc.description ?? cmd.description,
  };
}

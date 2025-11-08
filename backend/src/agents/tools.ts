import {tool} from 'langchain';
import * as z from 'zod';

export const getWeather = tool(
  ({ city }) => `It's always sunny in ${city}!`,
  {
    name: "get_weather",
    description: "Get the weather for a given city",
    schema: z.object({
      city: z.string(),
    }),
  },
);


export const executeSQL = tool(
  ({ query }, runtime) => {
    return runtime.context.db.run(query);
  },
  {
    name: "execute_sql",
    description: "Execute a SQLite command and return results",
    schema: z.object({
      query: z.string(),
    }),
  }
);
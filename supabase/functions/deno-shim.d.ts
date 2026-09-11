declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

type QueryResult = { data: unknown; error: { message: string } | null };

type FunctionQuery = Promise<QueryResult> & {
  select: (columns: string, options?: Record<string, unknown>) => FunctionQuery;
  not: (column: string, operator: string, value: null) => FunctionQuery;
  gte: (column: string, value: string) => FunctionQuery;
  eq: (column: string, value: string) => FunctionQuery;
  delete: () => FunctionQuery;
  in: (column: string, values: string[]) => FunctionQuery;
  upsert: (values: Record<string, unknown> | Record<string, unknown>[]) => FunctionQuery;
};

type FunctionClient = {
  from: (table: string) => FunctionQuery;
  auth: {
    getUser: () => Promise<{ data: { user: { id: string } | null }; error: { message: string } | null }>;
    admin: {
      deleteUser: (id: string) => Promise<{ error: { message: string } | null }>;
    };
  };
};

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export function createClient(
    url: string,
    key: string,
    options?: { global?: { headers?: Record<string, string> } },
  ): FunctionClient;
}

declare module 'npm:web-push@3.6.7' {
  const webpush: {
    setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
    sendNotification: (
      subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
      payload: string,
    ) => Promise<unknown>;
  };
  export default webpush;
}

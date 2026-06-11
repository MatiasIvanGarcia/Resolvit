export type PublicPlan =
  | { status: "expired" | "unpublished" | "not_found" | "invalid_code" | string; [k: string]: any }
  | {
      status: "ok";
      invite: { code: string; expires_at: string | null };
      plan: {
        id: string;
        title: string;
        person_name: string | null;
        start_question_id: string | null;
      };
      questions: Array<{
        id: string;
        ord: number;
        title: string;
        subtitle: string | null;
        options: Array<{
          id: string;
          ord: number;
          label: string;
          image_url: string | null;
          next_question_id: string | null;
        }>;
      }>;
    };

export type PlanRow = {
  id: string;
  title: string;
  person_name: string | null;
  status: string;
  background_image_url?: string | null;
  invite_title_template?: string | null;
  invite_body_template?: string | null;
  start_question_id?: string | null;
};

export type QuestionRow = {
  id: string;
  plan_id: string;
  ord: number;
  title: string;
  subtitle: string | null;
};

export type OptionRow = {
  id: string;
  question_id: string;
  ord: number;
  label: string;
  image_url: string | null;
  next_question_id: string | null;
};

export type PlanItem = {
  id: string;
  title: string;
  person_name: string | null;
  status: string;
  background_image_url: string | null;
  invite: null | { code: string; expires_at: string | null; share_url: string };
};
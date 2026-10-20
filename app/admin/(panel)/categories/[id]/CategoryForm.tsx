"use client";

import { useActionState } from "react";
import type { Category } from "@/lib/categories";
import { saveCategory, type FormState } from "../../../actions";

const YARN_COLORS = ["rose", "butter", "lilac", "mint", "sky", "peach"];

export default function CategoryForm({ category }: { category: Category }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveCategory, null);

  return (
    <form action={formAction} className="editor">
      <div>
        {state?.error && (
          <p className="notice notice-error" role="alert">
            {state.error}
          </p>
        )}

        <section className="panel">
          <input type="hidden" name="id" value={category.id} />
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" type="text" required defaultValue={category.name} />
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea id="description" name="description" rows={3} defaultValue={category.description} />
          </div>
          <div className="field">
            <label htmlFor="color">Yarn color</label>
            <select id="color" name="color" defaultValue={category.color}>
              {YARN_COLORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="sort_order">Order</label>
            <input id="sort_order" name="sort_order" type="number" defaultValue={category.sort_order ?? 0} />
          </div>
        </section>

        <div className="button-row">
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save category"}
          </button>
        </div>
      </div>
    </form>
  );
}

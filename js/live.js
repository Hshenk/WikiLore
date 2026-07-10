/**
 * The Wiki's single Supabase boundary.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

let supabase = null;

export function initLive() {
    supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}

/** Visible Articles for the home page */
export async function fetchArticleList() {
    const { data, error } = await supabase.rpc("wiki_list_articles");
    if (error) {
        throw new Error("Couldn't load the article list: " + error.message);
    }
    return data;
}

/** One visible article: { slug, title, category, sections: [{ heading, body }] }.
 *  Returns null when the article is either hidden or does not exist
 */
export async function fetchArticle(slug) {
    const { data, error } = await supabase.rpc("wiki_get_article", { article_slug: slug });
    if (error) {
        throw new Error("Couldn't load the article: " + error.message);
    }
    return data;
}

// ===================== GM Auth =====================
let isGm = false;

export function gmActive() {
    return isGm;
}

export async function resolveSession() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
        isGm = false;
        return false;
    }
    const { data: gmFlag, error } = await supabase.rpc("is_gm");
    isGm = !error && gmFlag === true;
    return isGm;
}

export async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        throw new Error("Sign-in failed: " + error.message);
    }
    return resolveSession();
}

export async function signOut() {
    await supabase.auth.signOut();
    isGm = false;
}

// ===================== GM Read Paths =====================

export async function fetchArticleListGm() {
    const { data, error } = await supabase
        .from("wiki_articles")
        .select("slug, title, category, visible")
        .order("title");
    if (error) {
        throw new Error("Couldn't load the GM article list: " + error.message);
    }
    return data;
}

// Fetch one article, including all secret sections
export async function fetchArticleGm(slug) {
    const { data, error } = await supabase
        .from("wiki_articles")
        .select("id, slug, title, category, visible, wiki_sections(heading, body, hidden, position)")
        .eq("slug", slug)
        .maybeSingle();
    if (error) {
        throw new Error("Couldn't load the article (GM): " + error.message);
    }
    if (!data) {
        return null;
    }

    const sections = data.wiki_sections;
    sections.sort((a, b) => a.position - b.position);

    return {
        id: data.id,
        slug: data.slug,
        title: data.title,
        category: data.category,
        visible: data.visible,
        sections: sections,
    };
}

// ===================== GM writes new articles =====================

export async function createArticle(meta) {
    const { data, error } = await supabase
        .from("wiki_articles")
        .insert(meta)
        .select("id, slug")
        .single();
    if (error) {
        throw new Error("Couldn't create the article: " + error.message);
    }
    return data;
}

/** Update an existing article's settings */
export async function updateArticle(id, meta) {
    const { error } = await supabase
        .from("wiki_articles")
        .update({  ...meta, updated_at: new Date().toISOString() })
        .eq("id", id);
    if (error) {
        throw new Error("Couldn't save the article: " + error.message);
    }
}

/** Replace all of the articles sections with the given list, in order */
export async function replaceSections(articleId, sections) {
    const removed = await supabase
        .from("wiki_sections")
        .delete()
        .eq("article_id", articleId);
    if (removed.error) {
        throw new Error("Couldn't clear old sections: " + removed.error.message);
    }

    if (sections.length === 0) {
        return;
    }

    const rows = sections.map((section, i) => ({
        article_id: articleId,
        position: i + 1,
        heading: section.heading,
        body: section.body,
        hidden: section.hidden,
    }));

    const inserted = await supabase.from("wiki_sections").insert(rows);
    if (inserted.error) {
        throw new Error("Couldn't save sections: " + inserted.error.message);
    }
}

export async function deleteArticle(id) {
    const { error } = await supabase
        .from("wiki_articles")
        .delete()
        .eq("id", id);
    if (error) {
        throw new Error("Couldn't delete the article: " + error.message);
    }
}
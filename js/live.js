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
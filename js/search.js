import { searchArticles } from "./live.js";

let getArticles = null;

export function initSearch(articleGetter) {
    getArticles = articleGetter;

    const input = document.querySelector("#search-box");
    const results = document.querySelector("#search-results");

    let timer = null;
    input.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => runSearch(input, results), 250);
    });

    input.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeSearch(input, results);
        }
    });

    results.addEventListener("click", (event) => {
        if (event.target.closest(".search-hit")) {
            closeSearch(input, results);
        }
    });

    // A click outside of the search area closes the dropdown
    document.addEventListener("click", (event) => {
        if (!event.target.closest(".search-wrap")) {
            results.classList.add("is-hidden");
        }
    });
}

function closeSearch(input, results) {
    input.value = "";
    results.classList.add("is-hidden");
}

async function runSearch(input, results) {
    const term = input.value.trim();
    if (term.length < 2) {
        results.classList.add("is-hidden");
        return;
    }

    // Instant half: from titles cached
    const lower = term.toLowerCase();
    const hits = getArticles()
        .filter((article) => article.title.toLowerCase().includes(lower))
        .map((article) => ({ slug: article.slug, title: article.title, snippet: "" }));
    
    // Server half: Body text 
    const seen = new Set(hits.map((hit) => hit.slug));
    try {
        for (const hit of await searchArticles(term)) {
            if (!seen.has(hit.slug)) {
                hits.push(hit);
            }
        }
    } catch (err) {
        console.warn(err.message);
    }

    renderResults(hits, results);
}

function renderResults(hits, results) {
    results.replaceChildren();
    results.classList.remove("is-hidden");

    if (hits.length === 0) {
        const none = document.createElement("p");
        none.className = "search-empty";
        none.textContent = "Nothing found.";
        results.append(none);
        return;
    }

    for (const hit of hits) {
        const link = document.createElement("a");
        link.className = "search-hit";
        link.href = "#/" + hit.slug;

        const title = document.createElement("span");
        title.className = "search-hit__title";
        title.textContent = hit.title;
        link.append(title);

        if (hit.snippet) {
            const snippet = document.createElement("span");
            snippet.className = "search-hit__snippet";
            snippet.textContent = "…" + hit.snippet + "…";
            link.append(snippet);
        }

        results.append(link);
    }
}
// Search function for tree unfold and search bar, save is true when using search bar
function search(param, save)
{
  anaisLog("Searching for "+param);

  if(save)
  {
    saveSearch(param);
  }

  let racine = "rech://amande/ou=organisation,dc=equipement,dc=gouv,dc=fr";
  return;
}

// Save search in preferences for later suggestions
function saveSearch(param)
{
  anaisLog("Saving "+param+" in suggestions");

  // Get existing searches from storage
  let history = getPreference("searchHistory");

  console.log(history);

  // Add the new search if it's not already in the list
  if (history && !history.includes(param))
    history.push(param);

  // Save the updated list back to storage
  setPreference("searchHistory", history);
}

// Show suggestions under search bar
async function showSuggestions(query)
{
  anaisLog("Showing suggestions");
  let suggestionsDiv = document.getElementById("anais-suggestions");
    suggestionsDiv.innerHTML = ""; // Clear previous suggestions

    if (!query)
    {
      suggestionsDiv.style.display = "none";
      return;
    }

    // Fetch saved searches
    let searchHistory = getPreference("searchHistory");

    // Filter searches based on the query
    let filtered = searchHistory.filter(term => term.toLowerCase().includes(query.toLowerCase()));

    // Show filtered results
    if (filtered.length > 0)
    {
        filtered.forEach(term => {
            let suggestionItem = document.createElement("div");
            suggestionItem.textContent = term;
            suggestionItem.style.padding = "5px";
            suggestionItem.style.cursor = "pointer";
            suggestionItem.style.borderBottom = "1px solid #eee";

            // On click, populate the search box and hide suggestions
            suggestionItem.addEventListener("click", () => {
                document.getElementById("anais-tbsearch").value = term;
                suggestionsDiv.style.display = "none";
            });

            suggestionsDiv.appendChild(suggestionItem);
        });

        // Display the suggestions box
        suggestionsDiv.style.display = "block";
    }
    else {
        suggestionsDiv.style.display = "none";
    }
}
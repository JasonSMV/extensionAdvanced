let Dicts = [
  {
    id: "1",
    name: "Longman English",
    url: "https://www.ldoceonline.com/dictionary/",
    active: true,
  },
  {
    id: "2",
    name: "Cambridge English",
    url: "https://dictionary.cambridge.org/us/dictionary/english/",
    active: true,
  },
  {
    id: "3",
    name: "Oxford English",
    url: "https://www.oxfordlearnersdictionaries.com/us/definition/english/",
    active: false,
  },
  {
    id: "4",
    name: "Longman English - Spanish",
    url: "https://www.ldoceonline.com/dictionary/english-spanish/",
    active: false,
  },
];

const googleImagesURL = "https://www.google.com/search?tbm=isch&q=";
let currentDictIndex = 0;

let popupURL = chrome.runtime.getURL("popup.html");
let popupId;
let popupTabId;
let word;
let listDictionaries;
let dictionary;
chrome.storage.sync.get(
  {
    DICTIONARIES_STORAGE_KEY: Dicts,
  },
  function (dicts) {
    console.log("list is", dicts.DICTIONARIES_STORAGE_KEY);
    const list = dicts.DICTIONARIES_STORAGE_KEY;
    const onlyActiveDictionaries = list.filter((dictionary) => {
      return dictionary.active == true;
    });
    listDictionaries = onlyActiveDictionaries;

    //   document.getElementById("color").value = items.favoriteColor;
    //   document.getElementById("like").checked = items.likesColor;
  }
);

try {
  chrome.webNavigation.onDOMContentLoaded.addListener(async function (details) {
    chrome.storage.sync.get(
      {
        DICTIONARIES_STORAGE_KEY: Dicts,
      },
      function (dicts) {
        console.log(dicts, Dicts);
        const list = dicts.DICTIONARIES_STORAGE_KEY;
        const onlyActiveDictionaries = list.filter((dictionary) => {
          return dictionary.active == true;
        });
        listDictionaries = onlyActiveDictionaries;
      }
    );

    console.log("on webNavigation");
    if (popupTabId == details.tabId) {
      console.log("new page loaded", details.tabId);
      await addNavBarAndRemoveHeader();
      await chrome.scripting.executeScript({
        target: { tabId: details.tabId, allFrames: false },
        func: eventListenerInputSearch,
      });
      await chrome.scripting.executeScript({
        target: { tabId: details.tabId, allFrames: false },
        func: fillInputWithWordAndSelectDictionary,
        args: [word, dictionary.id],
      });
      await chrome.scripting.executeScript({
        target: { tabId: details.tabId, allFrames: false },
        func: addButtonsEventListeners,
      });
    }
  });

  // On first install open onboarding to allow permissions.

  chrome.runtime.onInstalled.addListener((r) => {
    if (r.reason == "install") {
      //first install
      // show onboarding page
      chrome.tabs.create({
        url: "onboarding-page.html",
      });
    }
  });
  chrome.storage.onChanged.addListener((e) => {
    chrome.storage.sync.get(
      {
        DICTIONARIES_STORAGE_KEY: Dicts,
      },
      function (dicts) {
        const list = dicts.DICTIONARIES_STORAGE_KEY;
        const onlyActiveDictionaries = list.filter((dictionary) => {
          return dictionary.active == true;
        });
        listDictionaries = onlyActiveDictionaries;
      }
    );
  });

  //Fires when select omnibox for extension
  chrome.omnibox.onInputStarted.addListener(function () {
    //Set a default ...
    console.log("Omnibox started...");
    chrome.omnibox.setDefaultSuggestion({
      description:
        "Enter a word and select the dictionary (for example, <match>hello</match>)",
    });
  });
  //TODO instead of creating a new tab, update the current one.

  //fires when select option and press enter
  chrome.omnibox.onInputEntered.addListener(function (text) {
    //Open selection into a new tab
    chrome.tabs.create({ url: text });
  });

  //fires when input changes e.g keyUp
  chrome.omnibox.onInputChanged.addListener(function (text, suggest) {
    //TODO implement toPhonetics with https://github.com/ajlee2006/tophonetics-api
    //could send a request to my server to autofill resuts to add here....
    //{}

    // Add suggestions to an array
    var suggestions = [];
    //search Longman
    suggestions.push({
      deletable: true,
      content: "https://www.ldoceonline.com/dictionary/" + text,
      description: "(Search on Longman Dictionary) <match>" + text + "</match>",
    });
    //search Cambridge
    suggestions.push({
      deletable: true,
      content: "https://dictionary.cambridge.org/us/dictionary/english/" + text,
      description:
        "(Search on  Cambridge Dictionary) <match>" + text + "</match>",
    });
    // search Google imagenes.
    suggestions.push({
      deletable: true,
      content: "https://www.google.com/search?tbm=isch&q=" + text,
      description: "(Search on Google Images) <match>" + text + "</match>",
    });

    // Return  suggestions
    suggest(suggestions);
  });

  // When extension is clicked, this is fired.
  chrome.action.onClicked.addListener(function (tab) {
    chrome.tabs.create({
      url: chrome.runtime.getURL("popup.html"),
      active: true,
    });
  });

  /// Commands and popup windows

  chrome.commands.onCommand.addListener(async function (command) {
    console.log(`Command "${command}" triggered`);

    const currentWindow = await getCurrentWindow();
    if (!currentWindow) return;

    //Getting selected text in current window

    // If command is open dictionary.

    if (command === "openPopup") {
      await chrome.scripting.executeScript({
        target: { tabId: currentWindow.id, allFrames: true },
        func: getSelectedText,
      });
      //   await openOrCreatePopup(popupId);
    }
    if (command === "nextDict") {
      await changeDict(true);
    }

    if (command === "previousDict") {
      await changeDict(false);
    }
  });

  async function addNavBarAndRemoveHeader() {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: popupTabId, allFrames: false },
        func: addNavBar,
      });
      await chrome.scripting.executeScript({
        target: { tabId: popupTabId, allFrames: false },
        func: removeHeader,
      });
      await chrome.scripting.executeScript({
        target: { tabId: popupTabId, allFrames: false },
        func: populateSelectDict,
        args: [listDictionaries],
      });
    } catch (e) {
      console.error("Problem adding navbar", e);
    }
  }

  function populateSelectDict(dictionaries) {
    const select = document.getElementById("dictionariesSelect");
    select.innerHTML = "";
    dictionaries.forEach((dict) => {
      const option = document.createElement("option");
      if (dict.active) {
        option.value = dict.id;
        option.text = dict.name;
        select.appendChild(option);
      }
    });
    dictionary = dictionaries[0];
    console.log("Select is", select);
    console.log("Dictionary", dictionary);
  }

  function addNavBar() {
    const existingNavbar = document.querySelector("#navBarDict");
    if (existingNavbar) {
      existingNavbar.remove();
    }

    bootStrapLoader();

    const navBar = `
  <nav class="navbar bg-light fixed-top" id="navBarDict">
  <div class="container-fluid">
    <a class="navbar-brand" href="#" id="icon">
      <img
        src=${chrome.runtime.getURL("assets/books-128.png")}
        alt="Logo"
        width="30"
        height="24"
        class="d-inline-block align-text-top"
      />
      Dictionaries
    </a>

    <form class="d-flex w-50" role="search" data-search-form id="searchForm">
      <div class="input-group flex-nowrap">
        <input
          type="text"
          class="form-control"
          placeholder="Search"
          aria-label="Username"
          aria-describedby="addon-wrapping"
          id="searchInput"
        />
        <button
          class="btn btn-outline-secondary input-group-text"
          type="submit"
          id="button-addon2"
        >
          🔎
        </button>
      </div>
    </form>
    <div class="btn-group" role="group" aria-label="Basic example">
      <button type="button" class="btn btn-outline-secondary" id="forvoBtn">
        <img
          src=${chrome.runtime.getURL("assets/forvo-64.png")}
          width="24px"
        />
      </button>
      <button type="button" class="btn btn-outline-secondary" id="imagesBtn">
        <img
          src=${chrome.runtime.getURL("assets/google-images-30.png")}
          width="24px"
        />
      </button>
    </div>

    <div
      class="btn-group"
      role="group"
      aria-label="Button group with nested dropdown"
    >
      <button type="button" class="btn btn-outline-secondary" id="previousDictBtn">◀</button>

      <select class="form-select" aria-label="Default select example" id="dictionariesSelect" style="max-width: 185px">
      </select>
      <button type="button" class="btn btn-outline-secondary" id="nextDictBtn">▶</button>
    </div>
  </div>
</nav>
  `;
    document.body.insertAdjacentHTML("afterbegin", navBar);

    function bootStrapLoader() {
      let link = document.createElement("link");
      link.rel = "stylesheet";
      link.crossOrigin = "anonymous";
      link.integrity =
        "sha384-Zenh87qX5JnK2Jl0vWa8Ck2rdkQ2Bzep5IDxbcnCeuOxjzrPF/et3URy9Bv1WTRi";

      link.href =
        "https://cdn.jsdelivr.net/npm/bootstrap@5.2.2/dist/css/bootstrap.min.css";
      document.head.appendChild(link);
    }
  }

  async function changeDict(forward) {
    if (forward) {
      if (listDictionaries.length > currentDictIndex + 1) {
        currentDictIndex++;
      } else {
        currentDictIndex = 0;
      }
    } else {
      if (currentDictIndex == 0) {
        currentDictIndex = listDictionaries.length - 1;
      } else {
        currentDictIndex--;
      }
    }
    let [currentWindows] = await chrome.tabs.query({
      currentWindow: true,
    });
    dictionary = listDictionaries[currentDictIndex];
    let url = listDictionaries[currentDictIndex].url + word;
    if (currentWindows?.windowId == popupId) {
      chrome.tabs.update(currentWindows.id, {
        url: url,
      });
    }
  }

  function removeHeader() {
    console.log("Removing header");
    [...document.getElementsByClassName("header")].map((n) => n && n.remove());
    [...document.getElementsByClassName("searchbar")].map(
      (n) => n && n.remove()
    );

    if (document.getElementById("searchbar"))
      document.getElementById("searchbar").remove();

    if (document.getElementById("header"))
      document.getElementById("header").remove();
  }

  // receiving message

  chrome.runtime.onMessage.addListener(async function (
    request,
    sender,
    sendResponse
  ) {
    console.log(
      sender.tab
        ? "from a content script " + sender.tab.url
        : "from the extension"
    );
    console.log("messages", request.message);
    if (request.message.includes("inputTriggered")) {
      console.log("The message is ", request.message);
      word = request.message.split(",")[1];
      let selectedDictionaryId = request.message.split(",")[2];
      sendResponse({ farewell: "Input search triggered" });
      searchOnDict(word, selectedDictionaryId);
    }

    if (request.message.includes("searchOnCommand")) {
      console.log("The message is ", request.message);
      word = request.message.split(" ")[1];
      sendResponse({ farewell: "Search on command ongoing" });
      await openOrCreatePopup();
    }
    if (request.message.includes("googleImagesTriggered")) {
      word = request.message.split(" ")[1];
      sendResponse({ farewell: "Search on google images command ongoing" });
      searchOnGoogleImages();
    }
  });
  function fillInputWithWordAndSelectDictionary(wordToSearch, dictionaryId) {
    const searchForm = document.querySelector("#searchForm");
    const searchInput = document.querySelector("#searchInput");
    searchInput.value = wordToSearch;
    const selectedDictionary = document.querySelector("#dictionariesSelect");
    selectedDictionary.value = dictionaryId;
  }

  async function getCurrentWindow() {
    const [currentWindow] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (currentWindow?.url.startsWith("chrome")) return false;

    return currentWindow;
  }

  async function getSelectedText() {
    const selectedText = window.getSelection().toString().trim();
    console.log(window.top);
    if (window === window.top) {
      chrome.runtime.sendMessage(
        { message: `searchOnCommand ${selectedText}` },
        function (response) {
          console.log(response.farewell);
        }
      );
    }

    await chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { message: "Helloosssss" },
        { frameId: 0 }
      );
    });
  }

  async function openOrCreatePopup() {
    // creating a new
    new Promise((resolve) => {
      chrome.storage.local.get("UITabID", function (oSetting) {
        resolve(oSetting.UITabID || 0);
      });
    }).then((nTabID) => {
      chrome.windows.get(nTabID, async function (window) {
        if (chrome.runtime.lastError) {
          await sizeAndCenterPopup();
          console.log("loaded 666");
        } else {
          try {
            await chrome.windows.update(popupId, {
              focused: true,
            });
          } catch (e) {
            console.log("Problem updating focus to dictionary window", e);
          }
          searchDictOnCommand(word);
        }
      });
    });
  }

  async function sizeAndCenterPopup() {
    const displayInfo = await chrome.system.display.getInfo();

    const width = 1200;
    const height = 800;
    let left;
    let top;
    // Selecting primary monitor and getting the center.
    displayInfo.forEach((display) => {
      if (display.isPrimary) {
        left = parseInt((display.bounds.width - width) / 2);
        top = parseInt((display.bounds.height - height) / 2);
      }
    });

    // Creating centered windows.
    let url = listDictionaries[0].url + word;
    dictionary = listDictionaries[0];

    await chrome.windows.create(
      {
        focused: true,
        url: url,
        type: "popup",
        height: height,
        width: width,
        left: left,
        top: top,
      },
      function (window) {
        chrome.storage.local.set({ UITabID: window.id });
        popupId = window.id;
        popupTabId = window.tabs[0].id;
      }
    );
  }
  // Search based on what the input in the form has.
  function eventListenerInputSearch() {
    console.log("Event listener added. ");
    const searchForm = document.querySelector("#searchForm");
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const searchInput = document.querySelector("#searchInput");
      if (!searchInput.value) return;
      const selectedDictionary = document.querySelector("#dictionariesSelect");
      console.log("Submitted!");
      chrome.runtime.sendMessage(
        {
          message: `inputTriggered,${searchInput.value},${selectedDictionary.value}`,
        },
        function (response) {
          console.log(response.farewell);
        }
      );
    });
  }

  async function searchOnDict(word, selectedDictionaryId) {
    const selectedDictionary = listDictionaries.find(
      (dict) => dict.id === selectedDictionaryId
    );
    dictionary = selectedDictionary;

    let url = dictionary.url + word;

    chrome.tabs.update(popupTabId, {
      url: url,
    });
  }

  function eventListenerSelectedTextSearch() {
    const selectedText = window.getSelection().toString().trim();
    chrome.runtime.sendMessage(
      { message: `selectedTextTriggered ${selectedText}` },
      function (response) {
        console.log(response.farewell);
      }
    );
  }

  async function searchDictOnCommand(word) {
    let url = listDictionaries[0].url + word;

    await chrome.tabs.update(popupTabId, {
      url: url,
    });
  }

  function addButtonsEventListeners() {
    const forvoBtn = document.querySelector("#forvoBtn");
    const imagesBtn = document.querySelector("#imagesBtn");
    const previousDictBtn = document.querySelector("#previousDictBtn");
    const nextDictBtn = document.querySelector("#nextDictBtn");
    const searchInput = document.querySelector("#searchInput");
    imagesBtn.addEventListener("click", (e) => {
      if (!searchInput.value) return;
      chrome.runtime.sendMessage(
        { message: `googleImagesTriggered ${searchInput.value}` },
        function (response) {
          console.log(response.farewell);
        }
      );
    });
  }

  function searchOnGoogleImages() {
    let url = googleImagesURL + word;

    chrome.tabs.update(popupTabId, {
      url: url,
    });
  }
} catch (e) {
  console.log(e);
}

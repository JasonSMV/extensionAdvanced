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

const LOCAL_STORAGE_PREFIX = "DICTONARIES_LIST";
const DICTIONARIES_STORAGE_KEY = `${LOCAL_STORAGE_PREFIX}-dictonaries`;
const template = document.querySelector("#dictionary-template");
const dictonariesContainer = document.querySelector("#dictionary-list");

let listDictionaries;

const dictionaryList = document.getElementById("dictionary-list");

var sortable1 = Sortable.create(dictionaryList, {
  animation: 150,
  onUpdate: function (e) {
    // same properties as onEnd

    var list = dictionaryList.querySelectorAll("label");
    //console current order

    let newDictionaryList = [];
    list.forEach((dict) => {
      const dictionaryId = dict.dataset.id;
      const dictionary = listDictionaries.find(
        (dict) => dict.id === dictionaryId
      );
      newDictionaryList.push(dictionary);
    });
    listDictionaries = newDictionaryList;
    // saveDictionaries(); // use this to store in local storage.
    save_options();
  },
});

const checkboxes = document.querySelectorAll("input[type='checkbox']");

function renderDictionary(dictionary) {
  const templateClone = template.content.cloneNode(true);
  const labelDataId = templateClone.querySelector("[data-id]");
  labelDataId.dataset.id = dictionary.id;
  const textElement = templateClone.querySelector("[data-dictionary-name]");
  textElement.innerText = dictionary.name;
  const checkbox = templateClone.querySelector("[data-dictionary-checkbox]");
  checkbox.checked = dictionary.active;
  dictonariesContainer.appendChild(templateClone);
}

function loadDictionaries() {
  const dictionariesString = localStorage.getItem(DICTIONARIES_STORAGE_KEY);
  return JSON.parse(dictionariesString) || Dicts;
}

function saveDictionaries() {
  localStorage.setItem(
    DICTIONARIES_STORAGE_KEY,
    JSON.stringify(listDictionaries)
  );
}

dictonariesContainer.addEventListener("change", (e) => {
  if (!e.target.matches("[data-dictionary-checkbox]")) return;

  const parent = e.target.closest(".dictionary-label");
  const dictionaryId = parent.dataset.id;
  const dictionary = listDictionaries.find((dict) => dict.id === dictionaryId);
  dictionary.active = e.target.checked;
  //   saveDictionaries(); // use this one for local storage.
  save_options();
});

// Saves options to chrome.storage
function save_options() {
  const stringListDictionaries = listDictionaries;

  chrome.storage.sync.set(
    {
      DICTIONARIES_STORAGE_KEY: stringListDictionaries,
    },
    function () {
      // Update status to let user know options were saved.
      var status = document.getElementById("status");
      status.textContent = "Options saved.";
      setTimeout(function () {
        status.textContent = "";
      }, 750);
    }
  );
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.sync.get(
    {
      DICTIONARIES_STORAGE_KEY: Dicts,
    },
    function (dicts) {
      const list = dicts.DICTIONARIES_STORAGE_KEY;
      listDictionaries = list;
      listDictionaries.forEach(renderDictionary);

      //   document.getElementById("color").value = items.favoriteColor;
      //   document.getElementById("like").checked = items.likesColor;
    }
  );
}
document.addEventListener("DOMContentLoaded", restore_options);

function restoreDefaults() {
  const stringListDictionaries = Dicts;
  chrome.storage.sync.set({
    DICTIONARIES_STORAGE_KEY: stringListDictionaries,
  });
}

const restoreBtn = document.querySelector("[data-restore]");
restoreBtn.addEventListener("click", restoreDefaults);

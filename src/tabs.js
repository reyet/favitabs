function compareTabs(a, b) {
  var af = a.favIconUrl || '';
  var bf = b.favIconUrl || '';
  var au = a.url;
  var bu = b.url;
  var at = a.title;
  var bt = b.title;
  if (af < bf) { return -1; };
  if (af > bf) { return 1; };
  if (at < bt) { return -1; };
  if (at > bt) { return 1; };
  if (au < bu) { return -1; };
  if (au > bu) { return 1; };
  return a.id - b.id;
}

function create(t, c, element) {
  var e = document.createElement(t);
  e.className = c;
  if (element) {
    element.appendChild(e);
  }
  return e;
}

function makeGroups(currentId, tabs) {
  tabs.sort(compareTabs);
  var groups = [];
  var group = null;
  for (var i = 0; i < tabs.length; i++) {
    var tab = tabs[i];
    if (tab.id == currentId) {
      continue;
    }
    if (group == null || tab.favIconUrl != group.favIconUrl) {
      group = {favIconUrl: tab.favIconUrl, tabs: [], title: ''};
      groups.push(group);
    }
    group.tabs.push({
      fullTitle: tab.title,
      title: tab.title,
      id: tab.id,
      windowId: tab.windowId,
      url: tab.url,
      incognito: tab.incognito
    });
  }
  for (var i = 0; i < groups.length; i++) {
    chooseGroupTitle(groups[i]);
  }
  console.log(groups);
  return groups;
}


function chooseGroupTitle(group) {
  if (group.tabs.length < 2) {
    return;
  }
  // Tabs are already sorted by title, so if there is one in
  // > 50% of the tabs, it will be here:
  var central = group.tabs[Math.floor(group.tabs.length/2)].title;
  var sections = central.split(/( *[-–—|:~]+ *)/);
  var minRequired = group.tabs.length * .7;

  // Try progressively longer prefixes.
  var range = {from: 0, to: group.tabs.length};
  var bestInitial = '';
  var bestInitialLength = 0;
  var bestInitialRange;
  for (var i = 2; i < sections.length; i += 2) {
    var candidate = sections.slice(0, i).join('');
    if (candidate.length > 30) {
      break;
    }
    rangeForPrefix(group.tabs, range, candidate);
    if (range.to - range.from < minRequired) {
      break;
    } else {
      bestInitialLength = candidate.length;
      bestInitial = sections.slice(0, i - 1).join('');
      bestInitialRange = {from: range.from, to: range.to};
    }
  }

  // Now the same for suffixes. First we need to sort the tabs by their
  // reverse names, that way we can pick the right central tab to look
  // for suffixes in. So build a list of indexes into group.tabs and sort
  // it by reverse name.
  var reversed = [];
  var reversedNames = [];
  for (var i = 0; i < group.tabs.length; i++) {
    // NB this reverse does the wrong thing on multi-byte characters,
    // but since we only use it for ordering purposes we don't care.
    reversed.push(i);
    reversedNames.push(
      group.tabs[i].title.split('').reverse().join(''));
  }
  reversed.sort(function(a, b) {
    var ta = reversedNames[a];
    var tb = reversedNames[b];
    if (ta < tb) { return -1; }
    if (ta > tb) { return 1; }
    return 0;
  });
  central = group.tabs[reversed[Math.floor(reversed.length/2)]].title;
  sections = central.split(/( *[-–—|:~]+ *)/);
  
  // Try progressively longer suffixes.
  range = {from: 0, to: group.tabs.length};
  var bestFinal = '';
  var bestFinalLength = 0;
  var bestFinalRange;
  for (var i = 2; i < sections.length; i += 2) {
    var candidate = sections.slice(sections.length - i, sections.length).join('');
    if (candidate.length > 30) {
      break;
    }
    rangeForSuffix(reversed, group.tabs, range, candidate);
    if (range.to - range.from < minRequired) {
      break;
    } else {
      bestFinalLength = candidate.length;
      bestFinal = sections.slice(sections.length - i + 1, sections.length).join('');
      bestFinalRange = {from: range.from, to: range.to};
    }
  }

  if (bestInitialLength > bestFinalLength) {
    console.log('decision: ' + bestInitial, bestInitialRange.from, bestInitialRange.to);
    group.title = bestInitial;
    for (var i = bestInitialRange.from; i < bestInitialRange.to; i++) {
      var t = group.tabs[i].title;
      group.tabs[i].title = t.substring(bestInitialLength, t.length);
    }
  } else if (bestFinalLength > 0) {
    console.log('decision: ' + bestFinal, bestFinalRange.from, bestFinalRange.to);
    group.title = bestFinal;    
    for (var i = bestFinalRange.from; i < bestFinalRange.to; i++) {
      var j = reversed[i];
      var t = group.tabs[j].title;
      group.tabs[j].title = t.substring(0, t.length - bestFinalLength);   
    }
  }
}

function rangeForPrefix(tabs, range, prefix) {
  var len = prefix.length;
  while (tabs[range.from].title.substring(0, len) != prefix) { range.from++; }
  while (tabs[range.to-1].title.substring(0, len) != prefix) { range.to--; }
}

function rangeForSuffix(reversed, tabs, range, suffix) {
  var len = suffix.length;
  while (tabs[reversed[range.from]].title.substring(
          tabs[reversed[range.from]].title.length - len,
          tabs[reversed[range.from]].title.length) != suffix) { range.from++; }
  while (tabs[reversed[range.to-1]].title.substring(
          tabs[reversed[range.to-1]].title.length - len,
          tabs[reversed[range.to-1]].title.length) != suffix) { range.to--; }
}

function clickToTab(element, wid, tid) {
  element.addEventListener('click', function() {
    chrome.tabs.update(tid, {active: true});
    chrome.windows.update(wid, {focused: true});
    closePopup();
  });
}

function clickToClose(element, tid) {
  element.addEventListener('click', function(e) {
    e.stopPropagation();
    e.preventDefault();
    chrome.tabs.remove(tid);
  });
}

function hoverToHilite(element, wid) {
  element.addEventListener('mouseenter', function() {
    hiliteTabs(wid);
  });  
  element.addEventListener('mouseleave', function() {
    hiliteTabs(null);
  });  
}

function hiliteTabs(wid) {
  var tabs = document.querySelectorAll('.tab');
  for (var i = 0; i < tabs.length; i++) {
    if (tabs[i].windowId == wid) {
      tabs[i].setAttribute('hilite', 1);
    } else {
      tabs[i].removeAttribute('hilite');     
    }
  }
}

function showTabs(currentId, tabs) {
  var groups = makeGroups(currentId, tabs);

  var body = document.querySelector('#tabs');
  body.innerHTML = '';
  var group = null;
  for (var i = 0; i < groups.length; i++) {
    var group = groups[i];
    var g = create('DIV', 'group', body);
    if (group.title) {
      var t = create('DIV', 'grouptitle', g);
      t.textContent = group.title;
    }
    var f = create('IMG', 'icon', g);
    f.src = group.favIconUrl;

    for (var j = 0; j < group.tabs.length; j++) {
      var tab = group.tabs[j];
      var l = create('DIV', 'row', g);
      l.tid = tab.id;
      l.wid = tab.windowId;
      l.tabTitle = tab.title;
      l.fullTitle = tab.fullTitle;
      var d = create('DIV', 'tab', l);
      d.windowId = tab.windowId;
      var t = create('DIV', 'title', d);
      create('SPAN', '', t);
      create('SPAN', 'match', t);
      create('SPAN', '', t);
      setText(t, tab.title);
      t.setAttribute('title', tab.url);
      if (tab.incognito) {
        t.className += ' incognito';
      }
      var c = create('DIV', 'close', d);
      clickToTab(t, tab.windowId, tab.id);
      clickToClose(c, tab.id);
      hoverToHilite(t, tab.windowId);
    }
  }
}

// Set text content in a node which has three children, intended
// for the middle child to be a bolded section of the text.
function setText(e, pre, match, post) {
  e.children[0].textContent = pre || '';
  e.children[1].textContent = match || '';
  e.children[2].textContent = post || '';
}

var state = {
  query: '',
  shownRows: [],
  selectedRow: null
}

function update() {
  chrome.tabs.getCurrent(function(current) {
    chrome.tabs.query({}, function(tabs) {
      showTabs(current && current.id, tabs);
      state.selectedRow = null;
      updateSearch();
    });
  });
}

// Update shown tabs to reflect search. Also makes sure
// currently selected tab is one that's visible.
function searchFor(query) {
  state.query = query;
  updateSearch();
}

function updateSearch() {
  var query = state.query;
  console.log("searchFor('" + query + "')");
  var showAll = (query == '');
  var reg = new RegExp(query, 'i');
  var groups = document.querySelectorAll('.group');
  var allShown = [];
  
  for (var i = 0; i < groups.length; i++) {
    var g = groups[i];
    var rows = g.querySelectorAll('.row');
    var any = false;

    for (var j = 0; j < rows.length; j++) {
      var title = rows[j].querySelector('.title');
      var fullTitle = rows[j].fullTitle;
      var tabTitle = rows[j].tabTitle;
      var show = false;
      if (showAll) {
        show = true;
        setText(title, tabTitle);
      } else {
        var match = reg.exec(fullTitle);
        if (match) {
          show = true;
          match = reg.exec(tabTitle);
          if (match) {
            var start = match.index;
            var end = match.index + match[0].length;
            setText(title, tabTitle.substring(0, start), match[0], tabTitle.substring(end));
          } else {
            setText(title, tabTitle);
          }
        }
      }
      rows[j].dataset.show = show;
      any = any || show;
      if (show) {
        rows[j].shownIdx = allShown.length;
        allShown.push(rows[j]);
      } else {
        rows[j].shownIdx = null;
      }
    }
    g.dataset.show = any;
  }

  var matchtext = document.querySelector('#matchtext');
  matchtext.textContent = query;
  if (showAll) {
    matchtext.removeAttribute('shown');
  } else if (allShown.length > 0) {
    matchtext.setAttribute('shown', 'some');
  } else {
    matchtext.setAttribute('shown', 'none');    
  }

  state.shownRows = allShown;
  if (state.selectedRow && state.selectedRow.dataset.show != 'true') {
    console.log('clear shown');
    state.selectedRow.dataset.selected = false;
    state.selectedRow = null;
  }
  if (!state.selectedRow && allShown.length) {
    console.log('reset shown');
    state.selectedRow = allShown[0];
    state.selectedRow.dataset.selected = true;
  }
}

function DoSelected() {
  if (state.selectedRow) {
    chrome.tabs.update(state.selectedRow.tid, {active: true});
    chrome.windows.update(state.selectedRow.wid, {focused: true});
    closePopup();
  }
}

function IncSelected(offset) {
  if (!state.selectedRow) {
    return;
  }
  var idx = ((state.selectedRow.shownIdx || 0)
    + offset + state.shownRows.length) % state.shownRows.length;
  console.log(idx);
  state.selectedRow.dataset.selected = false;
  state.selectedRow = state.shownRows[idx];
  state.selectedRow.dataset.selected = true;
  state.selectedRow.scrollIntoViewIfNeeded();
}

document.addEventListener('DOMContentLoaded', function() {
  update();
  var search = document.querySelector('input.search');
  document.addEventListener('focus', function() { search.focus(); });
  search.addEventListener('blur', function(e) {
    search.focus();
  });
  search.addEventListener('input', function(e) {
    searchFor(e.target.value);
  });
  search.addEventListener('keydown', function(e) {
    switch (e.key) {
      case 'Enter':     e.preventDefault(); return DoSelected();
      case 'ArrowDown': e.preventDefault(); return IncSelected(1);
      case 'ArrowUp':   e.preventDefault(); return IncSelected(-1);
    }
  });
});

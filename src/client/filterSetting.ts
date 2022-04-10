import { Auth, CLIENT_ID } from "./auth";
import { Twitch_Api } from "./twitch_api";
import i18n from './i18n/index';

import Swal from 'sweetalert2';
import * as swal_setting from './swal_setting';

import { BroadcastChannel } from 'broadcast-channel';

const tapi: Twitch_Api = new Twitch_Api(CLIENT_ID);
const Toast = Swal.mixin(swal_setting.setting_def);

enum FilterType {
    badge = 'badge_uuid',
    name = 'login_name',
    keyword = 'keyword'
}
interface filterInfo{
    category: string;
    type: string;
    note: string;
    value: string;
}

setCurrentTheme();
const PAGE_LIST_CNT = 8; // 한 페이지에 표시할 목록 갯수.
const filterAddBtn = document.getElementById('filterAddBtn');
const searchBadgeBtn = document.getElementById('search-badge__btn');

const auth_info = <HTMLDivElement>document.getElementById('auth_info');
// const loginBtn = <HTMLButtonElement>document.getElementById('twitch-login__btn');
const dark_mode_btn = document.getElementById('dark_mode_btn');

const searchBadgeContainer = document.getElementById('search-badge__container');
const filterListContainer = document.getElementById('filter_list__container');

let currentBadgePageNum = 0;
let totalBadgePageNum = 0;
let currentFilterPageNum = 0;
let totalFilterPageNum = 0;

let searchedBadgeResult;
let searchedBadgeID = '';
let searchedBadgeChannel = '';

let badgeUserSearchedResult;
let filterUserSearchedResult;
let badgeUserSearchMode = false;
let filterUserSearchMode = false;

const messageIdChannel = new BroadcastChannel('MessageId');
const filterChannel = new BroadcastChannel('Filter');

let filter = new Map();

let localFilter = JSON.parse(localStorage.getItem('filter'));
let msg_id = '';

if(localFilter === null){
    // localStorage 에 필터 항목이 없는 경우, (처음 페이지에 방문)

    // 기본 필터 세팅
    const defaultFilter = [
        ['5527c58c-fb7d-422d-b71b-f309dcb85cc1', i18n.t('filter:streamer')],
        ['b817aba4-fad8-49e2-b88a-7cc744dfa6ec', i18n.t('filter:vip')],
        ['d12a2e27-16f6-41d0-ab77-b780518f00a3', i18n.t('filter:verified')],
        ['3267646d-33f0-4b17-b3df-f923a41db1d0', i18n.t('filter:manager')],
    ];
    for(let df of defaultFilter){

        const id = getRandomString();

        filter.set(id, {
            "category": 'badge_uuid',
            "filter_type": 'include',
            "filter_id": id,
            "note": df[1], // 배지의 경우 배지 이름, 닉네임과 키워드는 value 값과 동일하게.
            "value": df[0] // 배지는 uuid 나머지는 자기자신의 값.
        });
    }
}else{
    if(!Array.isArray(localFilter)){
        localFilter = Array.from(Object.entries(localFilter));
    }
    for (let f of localFilter) {
        filter.set(f[1].filter_id, f[1]);
    }
}
setFilter();
setFilterList(getFilter(), 1);

messageIdChannel.onmessage = msg => {
    if(!(msg.from === 'tbc' && msg.to.includes('wtbc-filter'))) return;
    if(msg_id === ''){
        msg_id = msg.msg_id;
    }
}
filterChannel.onmessage = msg => {
    if(!(msg.from === 'tbc' && msg.to.includes('wtbc-filter'))) return;

    if(msg_id === ''){
        msg_id = msg.msg_id;
    }

    const _filter = msg.filter;

    filter.clear();

    for (let f of _filter) {
        filter.set(f[1].filter_id, f[1]);
    }

    setFilter();
    setFilterList(getFilter(), 1);
}

function setPageLanguage(){
    document.getElementById('page-title').textContent = i18n.t('filterPage:title', {APP_NAME : "Twitch Badge Collector"});
    document.getElementById('title-addFilter').textContent = i18n.t('filterPage:addFilter');
    document.getElementById('title-searchBadge').textContent = i18n.t('filterPage:searchBadges');
    document.getElementById('title-filterList').textContent = i18n.t('filterPage:filterList');
    document.getElementById('title-searchBadge__description').textContent = i18n.t('filterPage:searchBadgeDescription');
    document.getElementById('cat_option_login').textContent = i18n.t('filter:login_name');
    document.getElementById('cat_option_keyword').textContent = i18n.t('filter:keyword');
    document.getElementById('cat_option_badge').textContent = i18n.t('filter:badge_uuid');
    (document.getElementById('filter-value') as HTMLInputElement).placeholder = i18n.t('filterPage:addFilterInputPlaceholder');
    document.getElementById('filter-include').textContent = i18n.t('filter:include');
    document.getElementById('filter-exclude').textContent = i18n.t('filter:exclude');
    document.getElementById('filter-sleep').textContent = i18n.t('filter:sleep');
    document.getElementById('filterAddBtn').textContent = i18n.t('page:add');
    (document.getElementById('search-badge__channel') as HTMLInputElement).placeholder = i18n.t('filterPage:searchChannelInputPlaceholder');
    (document.getElementById('search-badge__badgeName') as HTMLInputElement).placeholder = i18n.t('filterPage:searchBadgeInputPlaceholder');
    document.getElementById('search-badge__btn').textContent = i18n.t('page:search');
    (document.getElementById('filter-list__filterNote') as HTMLInputElement).placeholder = i18n.t('filterPage:searchFilterInputPlaceholder');
    document.getElementById('badge-image__title').textContent = i18n.t('filter:badge_uuid');
    document.getElementById('badge-channel__title').textContent = i18n.t('filterPage:channel');
    document.getElementById('badge-note__title').textContent = i18n.t('filterPage:note');
    document.getElementById('badge-description__title').textContent = i18n.t('filterPage:badgeName');
    document.getElementById('filter-category__title').textContent = i18n.t('filterPage:category');
    document.getElementById('filter-badge__title').textContent = i18n.t('filter:badge_uuid');
    document.getElementById('filter-value__title').textContent = i18n.t('filterPage:contents');
    document.getElementById('filter-type__title').textContent = i18n.t('filterPage:condition');
    document.getElementById('filter-control__rm-sel').textContent = i18n.t('filterPage:removeSelection');
    document.getElementById('filter-control__rm-all').textContent = i18n.t('filterPage:removeAll');
    document.getElementById('filter-control__backup').textContent = i18n.t('filterPage:backupFile');
    document.getElementById('filter-control__upload').textContent = i18n.t('filterPage:uploadFile');
}

setPageLanguage();

function setSearchedBadgeList(badges, channel: string, page: number){
    if(page <= 0) return;
    if(!badges) return;

    const badgeSearchedList = document.getElementById('search-badge__result');
    const badgeLine = badgeSearchedList.getElementsByClassName('badge-info__line');
    const badgesLen = badges.length;
    const pageCnt = calcPageNum(badgesLen, PAGE_LIST_CNT);

    currentBadgePageNum = page;
    totalBadgePageNum = pageCnt;

    searchBadgeContainer.getElementsByClassName('page-length')[0].textContent = pageCnt.toString();
    searchBadgeContainer.getElementsByClassName('search-badge__message')[0].textContent = i18n.t('filterPage:displaySearchResult', {count : badgesLen});
    
    let start_num = (PAGE_LIST_CNT * page) - (PAGE_LIST_CNT);
    let end_num = start_num + PAGE_LIST_CNT - 1;

    if (end_num > badgesLen || end_num === badgesLen) {
        end_num = end_num - (end_num - badgesLen) - 1;
    }

    let usedElementCnt = 1;
    for (let i = start_num; i <= end_num; i++) {
        const badge = badges[i];
        const divBadge = <HTMLDivElement>badgeLine[usedElementCnt];

        usedElementCnt++;

        let note = '';
        if(badge.type === 'subscriber'){
            note = badge.tier + ' ' + i18n.t('filterPage:tier');
        }else if(badge.type === 'bits'){
            note = i18n.t('filterPage:bits');
        }else{
            note = badge.type;
        }

        divBadge.setAttribute('index', i.toString());
        divBadge.getElementsByTagName('img')[0].src = badge.image_url_1x;
        divBadge.getElementsByTagName('img')[0].srcset = `${badge.image_url_1x} 1x, ${badge.image_url_2x} 2x, ${badge.image_url_4x} 4x`;
        divBadge.getElementsByClassName('badge-channel')[0].textContent = channel || 'Global';

        const badgeNote = divBadge.getElementsByClassName('badge-note')[0];
        const badgeDesc = divBadge.getElementsByClassName('badge-description')[0];
        badgeNote.textContent = note;
        badgeNote.setAttribute('title', note);
        badgeDesc.textContent = badge.title;
        badgeDesc.setAttribute('title', badge.title);

        divBadge.classList.remove('hidden');
    }
    if(PAGE_LIST_CNT - usedElementCnt < 8){
        for(let i = usedElementCnt; i <= 8; i++){
            const divBadge = <HTMLDivElement>badgeLine[i];
            divBadge.classList.add('hidden');
        }
    }

    searchBadgeContainer.getElementsByClassName('page-current')[0].textContent = currentBadgePageNum.toString();
}

function setFilterList(_filter: Map<string, any>, page: number){
    if(!_filter) return;

    const filterList = document.getElementById('filter-list__result');
    const filterLine = filterList.getElementsByClassName('filter-list__line');

    const filterLen = _filter.size;
    const pageCnt = calcPageNum(filterLen, PAGE_LIST_CNT);

    currentFilterPageNum = page;
    totalFilterPageNum = pageCnt;

    filterListContainer.getElementsByClassName('page-length')[0].textContent = pageCnt.toString();
    filterListContainer.getElementsByClassName('search-badge__message')[0].textContent = i18n.t('filterPage:displaySearchResult', {count : filterLen});

    let start_num = (PAGE_LIST_CNT * page) - (PAGE_LIST_CNT);
    let end_num = start_num + PAGE_LIST_CNT - 1;

    if (end_num > filterLen || end_num === filterLen) {
        end_num = end_num - (end_num - filterLen) - 1;
    }

    let usedElementCnt = 1;

    for (let i = start_num; i <= end_num; i++) {
        const filter = Array.from(_filter.values())[i];
        const divFilter = <HTMLDivElement>filterLine[usedElementCnt];

        usedElementCnt++;
        divFilter.setAttribute('filter_id', filter.filter_id);
        divFilter.setAttribute('filter_type', filter.filter_type);
        divFilter.getElementsByClassName('filter-category')[0].textContent = i18n.t(`filter:${filter.category}`);

        let badgeLink = '';
        let badge_srcset = '';

        if(filter.category === 'badge_uuid'){
            badgeLink = `https://static-cdn.jtvnw.net/badges/v1/${filter.value}/`;
            badge_srcset = `${badgeLink + 1} 1x, ${badgeLink + 2} 2x, ${badgeLink + 3} 4x`;
        }else{

        }
        const img = <HTMLImageElement>divFilter.getElementsByClassName('filter-badge')[0];
        img.src = badgeLink !== '' ? badgeLink + 1 : '';
        img.srcset = badge_srcset;
        
        const filter_value = divFilter.getElementsByClassName('filter-value')[0];
        filter_value.textContent = filter.note;
        filter_value.setAttribute('title', filter.note);
        const filter_type = divFilter.getElementsByClassName('filter-type')[0];
        const filter_type_cls = filter_type.classList;

        if(filter_type_cls.length >= 3){
            filter_type_cls.remove(filter_type_cls[2]);    
        }
        filter_type.classList.add(`filter-type__${filter.filter_type}`);
        filter_type.textContent = i18n.t(`filter:${filter.filter_type}`);
        
        divFilter.classList.remove('hidden');
    }
    if(PAGE_LIST_CNT - usedElementCnt < 8){
        for(let i = usedElementCnt; i <= 8; i++){
            const divFilter = <HTMLDivElement>filterLine[i];
            divFilter.classList.add('hidden');
        }
    }

    filterListContainer.getElementsByClassName('page-current')[0].textContent = currentFilterPageNum.toString();
}

function getFilterValuesFromPage(){
    const catSel = <HTMLSelectElement>document.getElementById('category-select');
    const catType = <HTMLSelectElement>document.getElementById('type-select');
    const filterValue = <HTMLInputElement>document.getElementById('filter-value');
    const badgeNote = <HTMLInputElement>document.getElementById('filter-add__badge-desc');

    const category = catSel.value;
    let value = '';
    let note = '';

    if(category === FilterType.badge){
        const badgePrev = <HTMLDivElement>document.getElementById('filter-add__badge-info');
        const idx = parseInt(badgePrev.getAttribute('index'));

        value = uuidFromURL(getBadge()[idx].image_url_1x);
        note = badgeNote.value;
    }else{
        value = filterValue.value;
        note = filterValue.value;
    }

    return {
        category : catSel.value,
        type : catType.value,
        note : note,
        value : value
    } as filterInfo;
}

function getFilter(origin?: boolean){
    if(origin) return filter;
    return filterUserSearchMode ? filterUserSearchedResult : filter;
}
function setFilter(){
    const filterStr = JSON.stringify(Array.from(filter));
    localStorage.setItem('filter', filterStr);
}
function sendFilter(from: string, to: string[]){
    const msg = {
        from : from,
        to : to,
        msg_id : msg_id,
        filter : Array.from(filter)
    }
    filterChannel.postMessage(msg);
}

function getBadge(){
    return badgeUserSearchMode ? badgeUserSearchedResult : searchedBadgeResult;
}
function initFilterInput(){
    (document.getElementById('filter-value') as HTMLInputElement).value = '';
}
function initBadgeInput(){
    (document.getElementById('filter-add__badge-desc') as HTMLInputElement).value = '';
    (document.getElementById('filter-add__badge-img') as HTMLImageElement).src = '';
    (document.getElementById('cat_option_badge')as HTMLOptionElement).classList.add('hidden');
}

async function deleteSelectedFilter(){

    const chboxes = document.getElementById('filter-list__result');
    const checkedBoxes = chboxes.querySelectorAll('input[type=checkbox]:checked');
    const boxlen = checkedBoxes.length

    if(boxlen === 0) return;

    const setting = swal_setting.ask_user;
    setting.title = i18n.t('filterPage:filterDelete');
    setting.text = i18n.t('filterPage:filterDeleteConfirm', {length : boxlen});
    setting.cancelButtonText = i18n.t('page:cancel');
    setting.confirmButtonText = i18n.t('page:apply');

    const confirm = await Swal.fire(setting);

    if(!confirm.isConfirmed) return;

    for (let chbox of Array.from(checkedBoxes)) {
        const line = chbox.closest('.filter-list__line');
        const chboxes = <HTMLInputElement>line.getElementsByClassName('filter-checkbox')[0];
        if (line.id === 'filter-list__title') {
            chboxes.checked = false;
            continue;
        }
        const filter_id = line.getAttribute('filter_id');
        chboxes.checked = false;
        filter.delete(filter_id);
    }

    // refresh filter list
    setFilterList(getFilter(), currentFilterPageNum);
    // save filter map object to localstorage
    setFilter();
    sendFilter('wtbc-filter', ['tbc', 'wtbc-main', 'wtbc-mini']);
}
async function deleteAllFilter(){

    const setting = swal_setting.ask_user;
    setting.title = i18n.t('filterPage:filterDelete');
    setting.text = i18n.t('filterPage:filterDeleteAllConfirm');
    setting.cancelButtonText = i18n.t('page:cancel');
    setting.confirmButtonText = i18n.t('page:apply');

    const confirm = await Swal.fire(setting);

    if(!confirm.isConfirmed) return;

    filter.clear();
    // refresh filter list
    setFilterList(getFilter(), currentFilterPageNum);
    // save filter map object to localstorage
    setFilter();
    sendFilter('wtbc-filter', ['tbc', 'wtbc-main', 'wtbc-mini']);
}

async function loadFilterFromFile(event:ProgressEvent){
    (document.getElementById('tbc_file_upload')as HTMLInputElement).value = '';
    const setting = swal_setting.ask_user;
    setting.title = i18n.t('filterPage:filterApply');
    setting.text = i18n.t('filterPage:filterInitConfirm');
    setting.cancelButtonText = i18n.t('page:cancel');
    setting.confirmButtonText = i18n.t('page:apply');

    const confirm = await Swal.fire(setting);

    if(!confirm.isConfirmed) return;

    let target = <FileReader>event.target;
    let _filter = JSON.parse(String(target.result));
    let meta = _filter.shift();

    if(!meta.version || !meta.date){
        Toast.fire(i18n.t('filterPage:uploadFilter'), i18n.t('filterPage:noMetaInFile'), 'error');
        return false;
    }

    filter.clear();

    for(let f of _filter){
        if(!f.filter_id || f.filter_id === ''){
            Toast.fire(i18n.t('filterPage:uploadFilter'), i18n.t('filterPage:noFilterID'), 'error');
            return;
        }
        if(!f.note) f.note = f.value;
        filter.set(f.filter_id, f);
    }
    setFilter();
    setFilterList(getFilter(), currentFilterPageNum);
    sendFilter('wtbc-filter', ['tbc', 'wtbc-main', 'wtbc-mini']);
}
function backupFilterToFile(){
    let _filter = Array.from(filter.values());

    let today = new Date();
    let year = today.getFullYear();
    let month = ('0' + (today.getMonth() + 1)).slice(-2);
    let day = ('0' + today.getDate()).slice(-2);
    let dateString = year + '-' + month + '-' + day;

    _filter.unshift({
        version: 'wtbc_0.0.1',
        date: new Date().getTime()
    });
    let serialized = JSON.stringify(_filter, null, 4);

    let vLink = document.createElement('a'),
        vBlob = new Blob([serialized], { type: "octet/stream" }),
        vName = dateString + '_filter_backup.tbc',
        vUrl = window.URL.createObjectURL(vBlob);
    vLink.setAttribute('href', vUrl);
    vLink.setAttribute('download', vName);
    vLink.click();
}

function uuidFromURL(url:string){
    let badge_uuid:string = '';

    try{
        badge_uuid = new URL(url).pathname.split('/')[3];
    }catch(e){
        return badge_uuid;
    }
    return badge_uuid;
}

function badgesToArray(badges){
    const bdSets = badges.badge_sets;
    const bdArr = [];
    for(let type of Object.keys(bdSets)){
        const versions = bdSets[type].versions;
        const v_key = Object.keys(versions);

        for(let v of v_key){
            versions[v].type = type;
            if(type === 'subscriber'){
                let tier: number;
                if(v.length <= 2){
                    tier = 1;
                }else if(v.length === 4 && v[0] === '2'){
                    tier = 2;
                }else if(v.length === 4 && v[0] === '3'){
                    tier = 3;
                }
                versions[v].tier = tier;
            }   
        }
        bdArr.push(...Object.values(bdSets[type].versions));
    }
    return bdArr;
}
function addFilter(filterInfo: filterInfo){
    const category = filterInfo.category;
    const type = filterInfo.type;
    const note = filterInfo.note;
    const value = filterInfo.value;

    initFilterInput();
    initBadgeInput();

    if(!value || value === ''){
        Toast.fire(i18n.t('filterPage:addFilter'), i18n.t('filterPage:noInputValue'), 'warning');
        return;
    }
    for(const f of filter.values()){
        if(f.category === category && f.value === value){
            Toast.fire(i18n.t('filterPage:addFilter'), i18n.t('filterPage:filterAlreadyExist'), 'warning');
            return;
        }
    }
    let id = getRandomString();
    while(filter.has(id)){
        id = getRandomString();
    }
    
    filter.set(id, {
        "category": category,
        "filter_type": type,
        "filter_id": id,
        "note": note, // 배지의 경우 배지 이름, 닉네임과 키워드는 value 값과 동일하게.
        "value": value // 배지는 uuid 나머지는 자기자신의 값.
    });

    setFilter();
    sendFilter('wtbc-filter', ['tbc', 'wtbc-main', 'wtbc-mini']);

    setFilterList(getFilter(), calcPageNum(filter.size, PAGE_LIST_CNT));
}

function setTheme(themeName) {
    let text, icon;

    if(themeName === 'light_theme'){
        text = i18n.t('page:darkmode');
        icon = 'dark_mode';
    }else{
        text = i18n.t('page:lightmode');
        icon = 'light_mode';
    }
    document.getElementById('dark_mode_btn_text').textContent = text;
    document.getElementById('dark_mode_btn_icon').textContent = icon;

    localStorage.setItem('theme', themeName);
    document.documentElement.className = themeName;
}

function setCurrentTheme(){
    if (localStorage.getItem('theme') === 'dark_theme') {
        setTheme('dark_theme');
    } else {
        setTheme('light_theme');
    }
}

function toggleTheme() {
    if (localStorage.getItem('theme') === 'dark_theme') {
        setTheme('light_theme');
    } else {
        setTheme('dark_theme');
    }
}

/**
     * 
     * @param len 표시할 객체 개수
     * @param pageCount 한 페이지에 표시할 필터 수
     * @returns page_num 필터 목록을 표시하는데 필요한 전체 페이지 수
     */
function calcPageNum(len: number, pageCount: number) {
    let page_num = Math.ceil(len / pageCount);
    if (len < pageCount) page_num = 1;
    return page_num;
}

function getRandomString() {
    return Math.random().toString(36).substring(2,12);
}

auth_info.addEventListener('click', e=> {
    document.getElementById('user_setting').classList.toggle('hidden');
});

dark_mode_btn.addEventListener('click', e=> {
    toggleTheme();
});

filterAddBtn.addEventListener('click', e => {
    addFilter(getFilterValuesFromPage());
    toggleBadgeInfo(FilterType.name);
});

searchBadgeBtn.addEventListener('click', async e => {
    const channel = <HTMLInputElement>document.getElementById('search-badge__channel');
    const searchCategory = channel.value === '' ? 'global' : 'channel';
    let req: Promise<any>;

    if(searchCategory === 'global'){
        if(searchedBadgeID === null) return;
        req = tapi.getGlobalChatBadges();
        
        searchedBadgeChannel = null;
        searchedBadgeID = null;
    }else if(searchCategory === 'channel'){
        if(channel.value === searchedBadgeID) return;

        let user = await tapi.get_users(channel.value);
        if(!user || !user.data || user.data.length === 0){
            return;
        }
        searchedBadgeChannel = user.data[0].display_name;
        searchedBadgeID = user.data[0].login;
        req = tapi.getChannelChatBadges(user.data[0].id);
    }
    req.then(badges => {
        searchedBadgeResult = badgesToArray(badges);
        badgeUserSearchMode = false;
        filterUserSearchMode = false;
        setSearchedBadgeList(getBadge(), searchedBadgeChannel, 1);
    });
    channel.value = '';
    
});

searchBadgeContainer.getElementsByClassName('page-backward')[0].addEventListener('click', e=> {
    if(currentBadgePageNum === 1) return;
    const page = currentBadgePageNum <= 1 ? currentBadgePageNum : currentBadgePageNum - 1;
    setSearchedBadgeList(getBadge(), searchedBadgeChannel, page);
});
searchBadgeContainer.getElementsByClassName('page-forward')[0].addEventListener('click', e=> {
    if(currentBadgePageNum === totalBadgePageNum) return;
    const page = currentBadgePageNum >= totalBadgePageNum ? currentBadgePageNum : currentBadgePageNum + 1;
    setSearchedBadgeList(getBadge(), searchedBadgeChannel, page);
});

filterListContainer.getElementsByClassName('pagination-cursor')[0].addEventListener('click', e=> {
    const target = <HTMLSpanElement>e.target;
    const classList = target.classList;
    let page = 1;
    
    if(classList.contains('page-backward')){
        if(currentFilterPageNum === 1) return;
        page = currentFilterPageNum <= 1 ? currentFilterPageNum : currentFilterPageNum - 1;
        
    }else if(classList.contains('page-forward')){
        if(currentFilterPageNum === totalFilterPageNum) return;
        page = currentFilterPageNum >= totalFilterPageNum ? currentFilterPageNum : currentFilterPageNum + 1;
    }
    setFilterList(getFilter(), page);
});

function toggleBadgeInfo(selectValue){
    const fvInput = document.getElementById('filter-value');
    const badgeInfo = document.getElementById('filter-add__badge-info');
    const catsel = <HTMLSelectElement>document.getElementById('category-select');
    const className = 'hidden';

    if(selectValue === FilterType.name || selectValue === FilterType.keyword){
        fvInput.classList.remove(className);
        badgeInfo.classList.add(className);
        catsel.value = selectValue;
        initBadgeInput();
    }else if(selectValue === FilterType.badge){
        fvInput.classList.add(className);
        badgeInfo.classList.remove(className);
    }
}

document.getElementById('category-select').addEventListener('change', e => {
    const target = <HTMLSelectElement>e.target;
    toggleBadgeInfo(target.value);
});

document.getElementById('search-badge__result').addEventListener('click', e =>{
    const target = <HTMLDivElement>e.target;
    const line = target.closest('.badge-info__line');
    if(!line) return;
    if(line.id === 'badge-info__title') return;

    const index = parseInt(line.getAttribute('index'));
    const badge = getBadge()[index];

    const catSelect = <HTMLSelectElement>document.getElementById('category-select');
    const badgeOption = <HTMLOptionElement>document.getElementById('cat_option_badge');
    const valueInput = <HTMLInputElement>document.getElementById('filter-value');
    const badgePrev = <HTMLDivElement>document.getElementById('filter-add__badge-info');
    const badgeImage = <HTMLImageElement>document.getElementById('filter-add__badge-img');
    const badgeDesc = <HTMLInputElement>document.getElementById('filter-add__badge-desc');

    catSelect.value = FilterType.badge;
    badgeOption.classList.remove('hidden');

    valueInput.classList.add('hidden');

    badgeImage.src = badge.image_url_2x;
    badgeDesc.value = `${searchedBadgeChannel || 'Global'} / ${badge.title}`;

    badgePrev.setAttribute('index', index.toString());
    badgePrev.classList.remove('hidden');
});

document.getElementById('search-badge__badgeName').addEventListener('input', e=> {
    const target = <HTMLInputElement>e.target;
    const value = target.value.toLowerCase();

    badgeUserSearchMode = value === '' ? false : true;

    if(value !== '' && searchedBadgeResult){
        badgeUserSearchedResult = searchedBadgeResult.filter(b => b.title.toLowerCase().includes(value) || b.type.toLowerCase().includes(value));
    }
    setSearchedBadgeList(getBadge(), searchedBadgeChannel, 1);
});

document.getElementById('filter-list__filterNote').addEventListener('input', e=> {
    const target = <HTMLInputElement>e.target;
    const value = target.value.toLowerCase();

    filterUserSearchMode = value === '' ? false : true;
    if(value !== ''){
        filterUserSearchedResult = new Map([...getFilter(true)].filter(([k, v])=> v.note.toLowerCase().includes(value)));
    }
    setFilterList(getFilter(), 1);
});

document.getElementById('filter-chackbox__title').addEventListener('change', e=> {
    const target = <HTMLInputElement>e.target;
    const filterList = document.getElementById('filter-list__result');
    const chboxes = filterList.getElementsByClassName('filter-checkbox');
    for(let c of Array.from(chboxes)){
        (c as HTMLInputElement).checked = target.checked;
    }
});

document.getElementById('filter-list__result').addEventListener('click', e=> {
    const target = <HTMLElement>e.target;
    const types = ['include', 'exclude', 'sleep'];
    const line = target.closest('.filter-list__line');

    if(!line) return;
    if(target.classList.contains('filter-type')){
        const type = line.getAttribute('filter_type');
        const current_index = types.indexOf(type);
        const nextIndex = (current_index + 1) % types.length;
        const newType = types[nextIndex];

        const id = line.getAttribute('filter_id');
        const newFilter = filter.get(id);
        newFilter.filter_type = newType;

        filter.set(id, newFilter);

        if(target.classList.length >= 3){
            target.classList.remove(target.classList[2]);    
        }
        target.classList.add(`filter-type__${newType}`);
        line.setAttribute('filter_type', newType);
        line.getElementsByClassName('filter-type')[0].textContent = i18n.t(`filter:${newType}`);
        setFilter();
        sendFilter('wtbc-filter', ['tbc', 'wtbc-main', 'wtbc-mini']);
    }
});

document.getElementById('filter-add__badge-desc').addEventListener('keyup', e=> {
    if (e.key === 'Enter') filterAddBtn.click();
});
document.getElementById('filter-value').addEventListener('keyup', e=> {
    if (e.key === 'Enter') filterAddBtn.click();
});
document.getElementById('search-badge__channel').addEventListener('keyup', e=> {
    if (e.key === 'Enter') searchBadgeBtn.click();
});

document.getElementById('filter-control__rm-sel').addEventListener('click', e=> {
    deleteSelectedFilter();
});
document.getElementById('filter-control__rm-all').addEventListener('click', e=> {
    deleteAllFilter();
});
document.getElementById('filter-control__backup').addEventListener('click', e=> {
    backupFilterToFile();
});
document.getElementById('tbc_file_upload').addEventListener('change', e => {
    let files = (<HTMLInputElement>e.target).files;
    let reader = new FileReader();
    reader.onload = loadFilterFromFile;
    if (files) {
        reader.readAsText(files[0]);
    }
});

document.addEventListener('click', e=> {
    const target = e.target as HTMLElement;

    if(!target.closest('#user_setting') && !target.closest('#auth_info')){
        document.getElementById('user_setting').classList.add('hidden');
    }

    e.stopPropagation();
});
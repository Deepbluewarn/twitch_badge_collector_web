import { Twitch_Api } from "./twitch_api";

export enum filter_category {
    Badge_UUID = 'badge_uuid',
    Login_name = 'login_name',
    Keyword = 'keyword'
}
export class Filter{
    _filter: any;
    tapi: Twitch_Api;

    constructor(tapi: Twitch_Api, filter?: Filter){
        this._filter = filter;
        this.tapi = tapi;
    }

    checkFilterWithValues(badges: string, message: string, username: string, disp_name: string){
        if(!this._filter) return '';
        let badge_priority = new Map();

        // Check with Nickname Filter.
        let username_res = this.checkFilter('login_name', username, true);
        let disp_name_res = this.checkFilter('login_name', disp_name, true);
        badge_priority.set('u_login_name', username_res);
        badge_priority.set('d_login_name', disp_name_res);

        // Check with Badge Filter.
        let bp_res: string[] = [];
        if(badges){
            for(let badge_str of badges.split(',')){
                let badge = this.tapi.channel_badges.get(badge_str) || this.tapi.global_badges.get(badge_str);
                if(!badge) break;

                let badge_uuid = new URL(badge.image_url_1x).pathname.split('/')[3];
    
                let res = this.checkFilter('badge_uuid', badge_uuid, true);
                bp_res.push(res);
            }
        }
        badge_priority.set('badge', this.select_cf_result(bp_res));

        // Check with Keyword Filter.

        let keyword_res = this.checkFilter('keyword', message, false);
        badge_priority.set('keyword', keyword_res);

        for(const[k, v] of badge_priority){
            if(v === 'FILTER_NOT_FOUND') continue;
            if(v === 'FILTER_INCLUDE'){
                if(['u_login_name', 'd_login_name'].includes(k)){
                    return 'login_name';
                }
                return <string>k;
            }
            break;
        }
        return '';
    }

    /**
     * 
     * @param category 필터 카테고리.
     * @param value 필터에서 찾고자 하는 값.
     * @returns 필터의 Category 와 Value 에 맞는 필터 중 filter_type 이 include 이면서 동시에 exclude 인 경우가 없으면 true 반환.
     */
    private checkFilter(category: string, value: string, match: boolean){
        let filter_arr = Object.keys(this._filter).map(el => this._filter[el]).filter(f => f.category === category && f.filter_type != 'sleep');

        let include, exclude;

        if(match){
            include = filter_arr.filter(el => (el.value.toLowerCase() === value.toLowerCase()) && (el.filter_type === 'include'));
            exclude = filter_arr.filter(el => (el.value.toLowerCase() === value.toLowerCase()) && (el.filter_type === 'exclude'));
        }else{
            include = filter_arr.filter(el => value.includes(el.value) && el.filter_type === 'include');
            exclude = filter_arr.filter(el => value.includes(el.value) && el.filter_type === 'exclude');
        }

        let i_len = include.length;
        let e_len = exclude.length;

        if(i_len === 0 && e_len === 0){
            return 'FILTER_NOT_FOUND'
        }else if(i_len != 0 && e_len === 0){
            return 'FILTER_INCLUDE';
        }else{
            return 'FILTER_EXCLUDE';
        }
    }

    private select_cf_result(bp_res: string[]) {

        if(bp_res.length === 0) return 'FILTER_NOT_FOUND';

        let f_ex_inc = bp_res.includes('FILTER_EXCLUDE');
        let f_in_inc = bp_res.includes('FILTER_INCLUDE');
        let f_nf_inc = bp_res.includes('FILTER_NOT_FOUND');

        if (f_ex_inc) {
            return 'FILTER_EXCLUDE';
        } else if (!f_ex_inc && f_in_inc) {
            return 'FILTER_INCLUDE';
        } else if (!f_ex_inc && !f_in_inc && f_nf_inc) {
            return 'FILTER_NOT_FOUND';
        }
    }

    set filter(filter){
        this._filter = filter;
    }
}
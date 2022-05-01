class Etc {
    static isEmpty(obj) {
        return Object.keys(obj).length === 0;
    }
    static trim_hash(str: string) {
		let c1: string = '';

		if (str && str !== '') {
			c1 = str[0] === '#' ? str.substring(1) : str;
		}
		return c1;
	}
    static getRandomString() {
        return Math.random().toString(36).substring(2,12);
    }
    static checkChannelValid(channel: string){
        return /^[a-zA-Z0-9]*$/i.test(channel);
    }
}

export { Etc };

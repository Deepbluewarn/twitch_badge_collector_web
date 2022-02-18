class Etc {
    static isEmpty(obj) {
        return Object.keys(obj).length === 0;
    }
    static getRandomString() {
        return Math.random().toString(36).substring(2,12);
    }
}

export { Etc };

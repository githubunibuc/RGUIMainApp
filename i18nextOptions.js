const path = require('path');
const os = require('os');

const i18nextOptions = {
    language: 'en',
    namespace: 'en_US',

    setLanguage(lng, ns)
    {
        this.language = lng;
        this.namespace = ns;
    },

    getOptions: function(env, front, appPath)
    {
        if (env == 'production') {
            return {
                lng: this.language,
                ns: ['en_US', this.namespace],
                defaultNS: this.namespace,
                fallbackLng: 'en',
                fallbackNS: 'en_US',
                load: 'languageOnly',
                preload: [this.language],
                backend:{
                    // path where resources get loaded from
                    loadPath: appPath + '/locales/{{ lng }}/{{ ns }}.json',
                    // path to post missing resources
                    addPath: appPath + '/locales/{{ lng }}/{{ ns }}.missing.json',
                    // jsonIndent to use when storing json files
                    jsonIndent: 2,
                },
            };
        } else {
            // console.log(this.language);
            return {
                lng: this.language,
                ns: ['en_US', this.namespace],
                defaultNS: this.namespace,
                fallbackLng: 'en',
                fallbackNS: 'en_US',
                load: 'languageOnly',
                preload: [this.language],
                // debug: true,
                saveMissing: true,
                saveMissingTo: 'current',
                initImmediate: front,
                backend:{
                    // path where resources get loaded from
                    loadPath: './locales/{{lng}}/{{ns}}.json',
                    // path to post missing resources
                    addPath: './locales/{{lng}}/{{ns}}.missing.json',
                    // jsonIndent to use when storing json files
                    jsonIndent: 2,
                    // custom parser
                    // parse: function(data) { return data; }
                },
            };
        }
    }
};

module.exports = i18nextOptions;
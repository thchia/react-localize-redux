// @flow
import React from 'react';
import { defaultTranslateOptions } from './locale';
import type { TranslatePlaceholderData, TranslatedLanguage, Translations, Options, LocalizedElement, Language } from './locale';

export const getLocalizedElement = (key: string, translations: TranslatedLanguage, data: TranslatePlaceholderData, activeLanguage: Language, options: Options = defaultTranslateOptions): LocalizedElement => {
  const onMissingTranslation = () => {
    if (options.missingTranslationCallback) {
      options.missingTranslationCallback(key, activeLanguage.code);
    }
    if (options.showMissingTranslationMsg === false) return ''
    const templatedMissing = templater(options.missingTranslationMsg || '', { key, code: activeLanguage.code });
    
    // Assume missing translations do NOT contain react components.
    if (typeof templatedMissing === 'string') return templatedMissing;
    return '';
  };
  const localizedString = translations[key] || onMissingTranslation();
  const translatedValue = templater(localizedString, data);

  let resolvedTranslatedValue;
  // convert to array
  if (typeof translatedValue === 'string') {
    resolvedTranslatedValue = [translatedValue];
  } else {
    resolvedTranslatedValue = translatedValue;
  }

  // check for any string html elements
  // e.g. [ '<a href="google.com">Go</a>' ]
  // and convert them to elements
  const mappedRt = resolvedTranslatedValue.map(rt => {
    if (typeof rt === 'string' && hasHtmlTags(rt) && options.renderInnerHtml) {
      return React.createElement('span', {dangerouslySetInnerHTML: {__html: rt}});
    }
    return rt;
  })

  // By this point, all non-react members have been converted to strings
  // So if the length of mappedRt is less than 2, we can return that translated
  // string as-is.
  // Otherwise return a span element.
  return mappedRt.length < 2 ? mappedRt[0] || ''  : React.createElement('span', null, ...mappedRt);
};

export const hasHtmlTags = (value: string): boolean => {
  const pattern = /(&[^\s]*;|<\/?\w+((\s+\w+(\s*=\s*(?:".*?"|'.*?'|[\^'">\s]+))?)+\s*|\s*)\/?>)/;
  return value.search(pattern) >= 0;
};

/**
 * @func templater
 * @desc A poor mans template parser 
 * @param {string} strings The template string
 * @param {object} data The data that should be inserted in template
 * @return {string} The template string with the data merged in
 */
export const templater = (strings: string, data: Object = {}): string => {
  
  const genericPlaceholderPattern = '(\\${\\s*[^\\s]+\\s*})'; // ${**}

  // e.g. get ['Hey ', <Component />] or ['Hey', 'google']
  let splitStrings = strings
    .split(new RegExp(genericPlaceholderPattern, 'gmi'))
    .filter(str => !!str)
    .map(templated => {
      let matched;
      for (let prop in data) {
        if (matched) break;
        const pattern = '\\${\\s*'+ prop +'\\s*}';
        const regex = new RegExp(pattern, 'gmi');
        if (regex.test(templated)) matched = data[prop];
      }
      return matched || templated;
    })
  
  // If all strings, reduce into single member
  // e.g. from ['Hey', 'google'] -> ['Hey google']
  // If there are any non-string elements, it will return undefined
  const reduced = splitStrings.reduce((acc, curr) => {
   if (typeof curr === 'string') return acc + curr;
  }, '')
  const res = reduced || splitStrings;
  return res;
};

export const getIndexForLanguageCode = (code: string, languages: Language[]): number => {
  return languages.map(language => language.code).indexOf(code);
};

export const objectValuesToString = (data: Object): string => {
  return !Object.values
    ? Object.keys(data).map(key => data[key].toString()).toString()
    : Object.values(data).toString();
};

export const validateOptions = (options: Options): Options => {
  if (options.translationTransform !== undefined && typeof options.translationTransform !== 'function') {
    throw new Error('react-localize-redux: Invalid translationTransform function.');
  }
  return options;
};

export const getTranslationsForLanguage = (language: Language, languages: Language[], translations: Translations): TranslatedLanguage => {
  // no language! return no translations 
  if (!language) {
    return {};
  }

  const { code: languageCode } = language;
  const languageIndex = getIndexForLanguageCode(languageCode, languages);
  return Object.keys(translations).reduce((prev, key) => {
    return {
      ...prev,
      [key]: translations[key][languageIndex]
    }
  }, {});
};

export const storeDidChange = (store: any, onChange: (prevState: any) => void) => {
  let currentState;

  function handleChange() {
    const nextState = store.getState();
    if (nextState !== currentState) {
      onChange(currentState);
      currentState = nextState;
    }
  }

  const unsubscribe = store.subscribe(handleChange);
  handleChange();
  return unsubscribe;
}

// Thanks react-redux for utility function
// https://github.com/reactjs/react-redux/blob/master/src/utils/warning.js
export const warning = (message: string) => {
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    console.error(message)
  }

  try {
    // This error was thrown as a convenience so that if you enable
    // "break on all exceptions" in your console,
    // it would pause the execution at this line.
    throw new Error(message)
  } catch (e) {}
}
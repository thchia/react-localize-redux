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

  if (typeof translatedValue === 'string') {
    if (translatedValue && hasHtmlTags(translatedValue) && options.renderInnerHtml) {
      return React.createElement('span', {dangerouslySetInnerHTML: {__html: translatedValue}});
    }
    return translatedValue;
  }
  return React.createElement('span', null, ...translatedValue);
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
  if (!strings) return '';
  
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
  
  // If any elements are not strings or numbers, return as-is...
  if (splitStrings.some(el => {
    return typeof el !== 'string' && typeof el !== 'number'
  })) {
    return splitStrings;
  }

  // otherwise combine all the strings/numbers into one string
  return splitStrings.reduce((acc, curr) => {
    return acc + `${curr}`;
  }, '')
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
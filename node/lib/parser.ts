
/**
 * Options to use for the HTML parser.
 * The default options are optimized for raw parsing speed.
 */
export interface ParserOptions {
    /**
     * Enables tracking of HTML Tag IDs.
     * 
     * The parser will cache tags during parsing on the fly.
     * Enabling this makes `getElementById()` lookups ~O(1).
     * 
     * Default: false
     */
    trackIds?: boolean,
    /**
     * Enables tracking of HTML Tag class names.
     * 
     * The parser will cache tags during parsing on the fly.
     * Enabling this makes `getElementsByClassName()` lookups ~O(1),
     * at the cost of a lot of hashing.
     * 
     * Default: false
     */
    trackClasses?: boolean
}

enum RawParserOptions {
    NONE = 0,
    TRACK_IDS = 1 << 0,
    TRACK_CLASSES = 1 << 1
}

function optionsToNumber(options: ParserOptions) {
    let flags = 0;
    if (options.trackIds) flags |= RawParserOptions.TRACK_IDS;
    if (options.trackClasses) flags |= RawParserOptions.TRACK_CLASSES;
    return flags;
}

export async function parse(source: string, options: ParserOptions = {}) {

}

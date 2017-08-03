<?php
/**
*   Common functions and variables used by both Indexer and Searcher
*
*   @author     Lee Garner <lee@leegarner.com>
*   @copyright  Copyright (c) 2017 Lee Garner <lee@leegarner.com>
*   @package    searcher
*   @version    0.0.1
*   @license    http://opensource.org/licenses/gpl-2.0.php
*               GNU Public License v2 or later
*   @filesource
*/
namespace Searcher;

/**
*   Common elements for the Searcher plugin
*   @package searcher
*/
class Common
{
    protected static $strpos;
    protected static $substr;
    protected static $strrpos;
    protected static $min_word_len = 3; // default
    protected static $stopwords = array();
    protected static $fields = array();
    protected $query = '';          // sanitized query string from user input
    protected $type = '';           // item type filter
    protected $tokens = array();    // tokenized query string
    protected $sql_tokens = '';     // sql-safe query string for searching
    protected $_searchDays = 0;     // number of days to limit search


    public function __construct()
    {
        self::Init();
    }


    /**
    *   Initialize static variables
    */
    protected static function Init()
    {
        global $_SRCH_CONF;

        include_once __DIR__ . '/../stopwords/english.php';
        self::$stopwords = $stopwords;

        self::$strpos = function_exists('mb_strpos') ? 'mb_strpos' : 'strpos';
        self::$substr = function_exists('mb_substr') ? 'mb_substr' : 'substr';
        self::$strrpos = function_exists('mb_strrpos') ? 'mb_strrpos' : 'strrpos';
        self::$min_word_len = $_SRCH_CONF['min_word_len'];
        // set supported fields
        self::$fields = array(
            'content'   => $_SRCH_CONF['wt_content'],
            'title'     => $_SRCH_CONF['wt_title'],
            //'comment'   => 3,
            'author'    => $_SRCH_CONF['wt_author'],
        );
    }


    /**
    *   Sets the query string and extracts tokens.
    *   This is in the Common class so it's available to the indexer, searcher
    *   and search form, even though sql_tokens is only used by the searcher.
    *
    *   @param  string  $query  Query string
    */
    public function setQuery($query)
    {
        $tokens = array();
        $this->query = self::_remove_punctuation($query);
        $this->tokens = self::Tokenize($query);
        foreach ($this->tokens as $token=>$dummy) {
            $tokens[] = DB_escapeString($token);
        }
        $this->sql_tokens = "'" . implode("','", $tokens) . "'";
    }


    /**
    *   Set the search scope by item type (article, staticpage, etc)
    *
    *   @param  string  $type   Type of item
    */
    public function setType($type)
    {
        if (!empty($type) && $type != 'all') {
            $this->type = DB_escapeString($type);
        }
    }


    /**
    *   Trim characters, allowing for multibyte
    *
    *   @param  string  $string     String to modify
    *   @return string      Modified string
    */
    protected static function _mb_trim($string)
    {
        $string = str_replace(chr(194) . chr(160), '', $string);
        $string = preg_replace( "/(^\s+)|(\s+$)/us", '', $string );
        return $string;
    }


    /**
    *   Remove puncuation and other special characters from strings
    *
    *   @param  string  $str    String to modify, e.g. content page
    *   @return string      Modified version
    */
    protected static function _remove_punctuation($str)
    {
        if (!is_string($str)) return '';
        $str = strip_tags($str);
        $repl_nospace = array(          // Replace with nothing
            '.', '…', '€', '&shy;', "\r", '@', '!',
        );

        $repl_space = array(            // Replace these with empty space
            chr(194) . chr(160),
            "'", '&nbsp;', '&#8217;', '"',
            "\n", "\t", '(', ')', '{', '}', '%', '$', '#', '[', ']', '+', '=',
            '_', '-', '`', ',', '<', '>', '=', ':', '?', ';', '&', '/', '\\',
        );

        //$str = preg_replace ('/<[^>]*>/', ' ', $str);
        $str = str_replace($repl_nospace, '', $str);
        $str = str_replace($repl_space, ' ', $str);
        $str = preg_replace('/\s\s+/', ' ', $str);
        preg_replace("/[^[:alnum:][:space:]]/u", '', $str);
        return trim($str);
    }


    /**
    *   Determine the length of a string.
    *   Uses mb_strlen() if available, falls back to strlen()
    *
    *   @param  string  $s      String to check
    *   @return integer         Length of string
    */
    protected static function _strlen($s)
    {
        return function_exists('mb_strlen') ? mb_strlen($s) : strlen($s);
    }


    /**
    *   Callback function to sort strings by length
    *
    *   @param  string  $a  First string
    *   @param  string  $b  Second string
    *   @return integer     Length difference (b - a)
    */
    protected static function _strlen_sort($a, $b)
    {
        return self::_strlen($b) - self::_strlen($a);
    }


    /* Helper function that does mb_stripos, falls back to mb_strpos and mb_strtoupper
     * if that cannot be found, and falls back to just strpos if even that is not possible.
     */
    protected static function _stripos($content, $term, $offset = 0)
    {
        if ($offset > self::_strlen($content)) return false;

        if (function_exists('mb_stripos')) {
            $pos = ("" == $content) ? false : mb_stripos($content, $term, $offset);
        } else if (function_exists('mb_strpos') && function_exists('mb_strtoupper') && function_exists('mb_substr')) {
            $pos = mb_strpos(mb_strtoupper($content), mb_strtoupper($term), $offset);
        } else {
            $pos = strpos(strtoupper($content), strtoupper($term), $offset);
        }
        return $pos;
    }


    /**
    *   Split a string into individual words.
    *   Optionally skip any "stop words"
    *
    *   @param  string  $str        Base string to split
    *   @param  boolean $phrases    True to create phrases, false to not.
    *   @return array       Array of tokens
    */
    public static function Tokenize($str, $phrases=true)
    {
        global $_SRCH_CONF;

        $tokens = array();
        if (is_array($str)) {
            foreach ($str as $part) {
                $tokens = array_merge($tokens, self::Tokenize($part));
            }
        }
        if (is_array($str)) return $tokens;

        if (function_exists('mb_internal_encoding'))
            mb_internal_encoding('UTF-8');

        $str = self::_remove_punctuation($str);

        $str = function_exists('mb_strtolower') ?
                mb_strtolower($str) : strtolower($str);

        // Get all the words from the content string. Check against stopwords
        // and minimum word length, if passed then add to the "terms" array.
        $terms = preg_split('/[\s,]+/', $str);

        // Step 1: Get all the terms that aren't excluded by length or
        // stopword status
        $tmp = array();
        foreach ($terms as $term) {
            if (in_array($term, self::$stopwords) ||
                    self::_strlen($term) < self::$min_word_len) {
                continue;
            }
            $tmp[] = $term;
        }
        $terms = $tmp;
        unset($tmp);
        $total_terms = count($terms);

        // Step 2: Stem the terms, if used. Leave duplicates
        if (!empty($_SRCH_CONF['stemmer'])) {
            USES_search_class_stemmer();
            $S = Stemmer::getInstance($_SRCH_CONF['stemmer']);
            if ($S !== NULL) {
                for ($i = 0; $i < $total_terms; $i++) {
                    $terms[$i] = $S->stem($terms[$i]);
                }
            }
        }

        // Step 3: Create token array, removes duplicates
        $tokens = array();
        for ($i = 0; $i < $total_terms; $i++) {
            // Set the term alone in the token array
            $t = $terms[$i];
            if (isset($tokens[$t])) {
                $tokens[$t]['count']++;
            } else {
                $tokens[$t] = array(
                    'count' => 1,
                    'weight' => $_SRCH_CONF['wordweight'][1],
                );
            }
            // Get the phrases into the token array
            for ($j = 1; $j < $_SRCH_CONF['max_word_phrase']; $j++) {
                if (isset($terms[$i+$j])) {
                    // If not reaching the end of $terms, concatenate
                    // the next term(s)
                    $t .= ' ' . $terms[$i+$j];
                    if (isset($tokens[$t])) {
                        $tokens[$t]['count']++;
                    } else {
                        $tokens[$t] = array(
                            'count' => 1,
                            'weight' => $_SRCH_CONF['wordweight'][$j+1],
                        );
                    }
                }
            }
        }

        return $tokens;
    }


    /**
    *   Remove autotags before indexing (optional) and before showing results.
    *   This option is to prevent search hits on hidden fields that don't
    *   actually appear in the content.
    *
    *   @param  string  $content    Content to examine
    *   @return string      Content withoug autotags
    */
    protected static function removeAutoTags($content)
    {
        static $autolinkModules = NULL;
        static $tags = array();

        // Just return content if there are no autotags
        if (strpos($content, '[') === false) {
            return $content;
        }

        if ($autolinkModules === NULL) {
            $autolinkModules = PLG_collectTags();
            foreach ($autolinkModules as $moduletag => $module) {
                $tags[] = $moduletag;
            }
            $tags = implode('|', $tags);
        }
        if (!empty($tags)) {
            $content = preg_filter("/\[(($tags)\:.[^\]]*\])/i", '', $content);
        }
        return $content;
    }

}

?>

<?php
/**
*   Default English Language file for the Searcher plugin.
*
*   @author     Lee Garner <lee@leegarner.com>
*   @copyright  Copyright (c) 2017 Lee Garner
*   @package    searcher
*   @version    0.0.1
*   @license    http://opensource.org/licenses/gpl-2.0.php 
*               GNU Public License v2 or later
*   @filesource
*/

/**
*   The plugin's lang array
*   @global array $LANG_SRCH
*/
$LANG_SRCH = array(
    'menu_label'    => 'Searcher',
    'generate_all'  => 'Generate All',
    'regenerate'    => 'Regenerate Indexes',
    'version'       => 'Version',
);

// Localization of the Admin Configuration UI
$LANG_configsections['searcher'] = array(
    'label' => 'Searcher',
    'title' => 'Search Plugin Configuration',
);

$LANG_confignames['searcher'] = array(
    'min_word_len' => 'Minimum Word Length to consider',
    'excerpt_len' => 'Length of excerpt to display',
    'perpage'   => 'Results to show per page',
    'wt_title' => 'Weighting for results in titles',
    'wt_content' => 'Weighting for results in content',
    'wt_author' => 'Weighting for results in author names',
);

$LANG_configsubgroups['searcher'] = array(
    'sg_main' => 'Main Settings',
);

$LANG_fs['searcher'] = array(
    'fs_main' => 'Main Settings',
    'fs_weight' => 'Weightings',
);

$LANG_configselects['searcher'] = array(
    10 => array(' 1' => 1, ' 2' => 2, ' 3' => 3, ' 4' => 4, ' 5' => 5,
                ' 6' => 6, ' 7' => 7, ' 8' => 8, ' 9' => 9, '10' => 10),
);

?>

/**
 * glFusion Searcher Plugin - Ajax Indexer
 *
 * Indexes all content types
 *
 * LICENSE: This program is free software; you can redistribute it
 *  and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * @category   glFusion CMS
 * @package    searcher
 * @author     Mark R. Evans  mark AT glFusion DOT org
 * @copyright  2015-2017 - Mark R. Evans
 * @license    http://opensource.org/licenses/gpl-2.0.php - GNU Public License v2 or later
 *
 */

/* ***************************************************************************
 * NOTE: Must update indexer.min.js for distribution
 * ***************************************************************************
 */

var searcherinit = (function() {

    // public methods/properties
    var pub = {};

    // private vars
    var contenttypes  = null,  // array of all content types
    contenttype       = null,  // current content type being processed
    contentLists      = null,
    content           = null,
    contentCount      = 0,
    contentDone       = 1,
    url               = null,
    done              = 1,
    count             = 0,
    contenttypeErrorCount  = 0,
    indexingMessage   = '',
    $m                = null;
    $t                = null;

    /**
    * sets HTML
    * retrieves content type list from glFusion
    *
    * calls indexContentType
    *
    */
    pub.update = function() {
        done = 1;

        console.log('Indexer: In pub.update - retrieving list of content types');

        // retrieve the URL from the form
        url = $( '#reindexform' ).attr( 'action' );

        $("#indexer_batchprocesor").show();
        $('#reindexbutton').prop("disabled",true);
        $("#reindexbutton").html(lang_indexing);
        t_on();

        message(lang_retrieve_content_types);

        $.ajax({
            type: "POST",
            dataType: "json",
            url: url,
            data: {"getcontenttypes" : "x" },
            timeout: 30000,
        }).done(function(data) {
            var result = $.parseJSON(data["js"]);
            if ( result.errorCode != 0 ) {
                console.log('Indexer: Content Type List returned no results');
                alert(lang_error_getcontenttypes);
                window.location.href = destination;
            }
            contenttypes = result.contenttypes;
            count = contenttypes.length;
            contenttype = contenttypes.shift();
            window.setTimeout(processContentTypes,250);
        }).fail(function(jqXHR, textStatus ) {
            console.log("Indexer: Error retrieving content type list from glFusion");
            alert(lang_error_getcontenttypes);
            window.location.href = destination;
        });
        return false; // prevent from firing
    };

    /**
    * initialize everything
    */
    pub.init = function() {
        // $m is the status message area
        $m = $('#batchinterface_msg');
        $t = $('#t');
        // if $m does not exist, return.
        if ( ! $m) {
            return;
        }
        console.log('Indexer: In pub.init - calling pub.update');
        // init interface events
        $('#reindexbutton').click(pub.update);
    };

    /**
    * Processes all content for content type
    *
    * controls UI updates
    *
    * calls init colums
    */

    var processContentTypes = function() {
        console.log('Indexer: In processContentTypes()');
        if (contenttype) {
           if ($('#ct_' + contenttype).is(":checked")) {
                console.log('Indexer: In processContentTypes() - processing type: ' + contenttype);
                var percent = Math.round(( ( done - 1 ) / count ) * 100);
                if ( percent == 0 ) {
                    percent = Math.round((( done  / count ) * 100) / 2 );
                }
                $('#pb').css('width', percent + "%");
                $('#pb').html(percent + "%");
                contenttypeErrorCount = 0;
                var wait = 250;
                window.setTimeout(initContent, wait);
            } else {
                contenttype = contenttypes.shift();
                window.setTimeout(processContentTypes,250);
            }
        } else {
            console.log('Indexer: In processContentTypes() - reindexing content');
            finished();
        }
    };


    /**
    * Called when all content items in a content type have been processed
    */

    var finishContent = function() {
        console.log('Indexer: In finishContent()');
          var dataS = {
              "contentcomplete" : 'x',
              "type" : contenttype,
          };
          data = $.param(dataS);
          $.ajax({
              type: "POST",
              dataType: "json",
              url: url,
              data: data,
              timeout:120000
          }).done(function(data) {
              var result = $.parseJSON(data["js"]);
              if ( result.errorCode != 0 ) {
                  console.log("Indexer: " + result.message );
                  contentypeErrorCount++;
                  indexingMessage = indexingMessage + lang_content_type + ': ' + contenttype + ' :: ' + result.message + '<br>';
              }
          }).fail(function(jqXHR, textStatus ) {
              indexingMessage = indexingMessage + lang_content_type + ': ' + contenttype + ' :: ' + lang_remove_fail + '<br>';
              if (textStatus === 'timeout') {
                  console.log("Indexer: Timeout in finishContent " + contenttype);
              }
          }).always(function( xhr, status ) {
            var percent = 100;
            done++;
            $('#pb-current').css('width', percent + "%");
            $('#pb-current').html(percent + "%");
            contenttype = contenttypes.shift();
            window.setTimeout(processContentTypes,250);
          });
    };

    /**
    * Remove existing index entries
    */

    var initContent = function() {
        if (contenttype) {
            console.log("removing old content: " + contenttype);
            message(lang_remove_content_1 + contenttype + lang_remove_content_2);
            var dataS = {
                "removeoldcontent" : 'x',
                "type" : contenttype,
            };
            data = $.param(dataS);
            $.ajax({
                type: "POST",
                dataType: "json",
                url: url,
                data: data,
                timeout:120000
            }).done(function(data) {
                var result = $.parseJSON(data["js"]);
                if ( result.errorCode != 0 ) {
                    console.log("Indexer: " + result.message );
                    contentypeErrorCount++;
                    indexingMessage = indexingMessage + lang_content_type + ': ' + contenttype + ' :: ' + result.message + '<br>';
                }
            }).fail(function(jqXHR, textStatus ) {
                indexingMessage = indexingMessage + lang_content_type + ': ' + contenttype + ' :: ' + lang_remove_fail + '<br>';
                if (textStatus === 'timeout') {
                    console.log("Indexer: Timeout removing existing index entries for " + contenttype);
                    var wait = 120000;
                    window.setTimeout(getContentList, wait);
                }
            }).always(function( xhr, status ) {
                var wait = 250;
                window.setTimeout(getContentList, wait);
            });
        }
    };

    /**
    * Remove existing index entries
    */
    var getContentList = function() {
        if (contenttype) {
            console.log("processing content type " + contenttype);
            itemList = null;

        message(lang_retrieve_content_list + contenttype);

            var dataS = {
                "getcontentlist" : 'x',
                "type" : contenttype,
            };

            data = $.param(dataS);

            contentDone = 1;
            var percent = 0;
            $('#pb-current').css('width', percent + "%");
            $('#pb-current').html(percent + "%");

            $.ajax({
                type: "POST",
                dataType: "json",
                url: url,
                data: data,
                timeout:60000
            }).done(function(data) {
                var result = $.parseJSON(data["js"]);
                if ( result.errorCode != 0 ) {
                    console.log("Indexer: " + result.message );
                    contentypeErrorCount++;
                    indexingMessage = indexingMessage + lang_content_type + ': ' + contenttype + ' :: ' + result.message + '<br>';
                }
                contentLists = result.contentlist;
                contentCount = contentLists.length;
                console.log("There are " + contentCount + " items for content type " + contenttype);
                content = contentLists.shift();
            }).fail(function(jqXHR, textStatus ) {
                indexingMessage = indexingMessage + lang_content_type + ': ' + contenttype + ' :: ' + 'Failed to retrieve content list<br>';
                if (textStatus === 'timeout') {
                    console.log("Indexer: Unable to retrieve content list for " + contenttype);
                    alert(lang_error_getcontentlist + " :: " + contenttype);
                    window.location.href = destination;
                }
            }).always(function( xhr, status ) {
                var wait = 250;
                window.setTimeout(processContent, wait);
            });

        }
    };

    /**
    * process each content type for content type
    *
    * if a column cannot convert - display in the error section
    */
    var processContent = function() {

        if (content) {

            var dataS = {
                "index" : 'x',
                "type" : contenttype,
                "id" : content.id,
            };

            data = $.param(dataS);

            message(lang_indexing + ' ' + done + '/' + count + ' - '+ contenttype + ' - ' + content.id);

            var percent = Math.round(( contentDone / contentCount ) * 100);

            if ( percent == 0 ) percent = 1;

            $('#pb-current').css('width', percent + "%");
            $('#pb-current').html(percent + "%");

            $.ajax({
                type: "POST",
                dataType: "json",
                url: url,
                data: data,
                timeout:60000
            }).done(function(data) {
                var result = $.parseJSON(data["js"]);
                if ( result.errorCode != 0 ) {
                    console.log("Indexer: Error indexing content");
                    contenttypeErrorCount++;
                    indexingMessage = indexingMessage + lang_content_type + ': ' + contenttype + ' ID: ' + content.id + ' :: ' + result.statusMessage + '<br>';
                }
            }).fail(function(jqXHR, textStatus ) {
                if (textStatus === 'timeout') {
                    console.log("Indexer: Error indexing item " + content);
                    indexingMessage = indexingMessage + lang_content_type + ': ' + contenttype + ' ID: ' + content.id + ' :: ' + result.statusMessage + '<br>';
                }
            }).always(function( xhr, status ) {
                contentDone++;
                content = contentLists.shift();
                var wait = 250;
                window.setTimeout(processContent, wait);
            });
        } else {
        	window.setTimeout(finishContent,250);
/*
            var percent = 100;
            done++;
            $('#pb-current').css('width', percent + "%");
            $('#pb-current').html(percent + "%");
            contenttype = contenttypes.shift();
            window.setTimeout(processContentTypes,250);
*/
        }
    };

    /**
    * called when done - we make an ajax call
    * that currently fails as we are not setup for this one
    * need to update.
    */
    var finished = function() {

        $('#pb').css('width', "100%");
        $('#pb').html("100%");
        t_off();
        message(lang_success);

        window.setTimeout(function() {
            // ajax call when reindexing is complete
            $.ajax({
                type: "POST",
                dataType: "json",
                url: url,
		            data: {"complete" : "x" },
            }).done(function(data) {
	            UIkit.modal.alert(lang_success);
	            var $msgWindow = $('#indexer_messages');
	            if ( indexingMessage == '' ) indexingMessage = lang_no_errors;
	            $msgWindow.html(indexingMessage);
	            $("#indexer_message_window").show();
	            $("#reindexbutton").html(lang_index);
	            $('#reindexbutton').prop("disabled",false);
            });
        }, 3000);

/* - this part comes out
        window.setTimeout(function() {
            UIkit.modal.alert(lang_success);
            var $msgWindow = $('#indexer_messages');
            if ( indexingMessage == '' ) indexingMessage = lang_no_errors;
            $msgWindow.html(indexingMessage);
            $("#indexer_message_window").show();
            $("#reindexbutton").html(lang_index);
            $('#reindexbutton').prop("disabled",false);
        }, 3000);
*/
    };

    /**
    * Gives textual feedback
    * updates the ID defined in the $msg variable
    */
    var message = function(text) {
        $m.html(text);
    };

    /**
    * add a throbber image
    */
    var t_on = function() {
        $t.show();
    };

    /**
    * Stop the throbber
    */
    var t_off = function() {
        $t.hide();
    };

    // return only public methods/properties
    return pub;
})();

$(function() {
    searcherinit.init();
});
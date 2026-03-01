/**
 * GHL Places Autocomplete Script
 * Version: 1.0
 * 
 * This script provides Google Places autocomplete functionality for GHL funnels.
 * It uses the new Places API (AutocompleteSuggestion) which works with any API key.
 * 
 * Usage:
 * 1. Host this file on S3, GitHub, or any CDN
 * 2. Add to your GHL page:
 *    <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places&v=weekly" async defer></script>
 *    <script src="YOUR_HOSTED_URL/ghl-places-autocomplete.js" defer></script>
 * 3. Add the custom address input HTML inside your form
 */

var GHLPlaces = {
    customInput: null,
    ghlInput: null,
    suggestionsContainer: null,
    debounceTimer: null,
    sessionToken: null,
    setupComplete: false,

    init: function() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', GHLPlaces.setup);
        } else {
            GHLPlaces.setup();
        }
    },

    setup: function() {
        // Delay checkbox init to allow GHL to render the form
        setTimeout(GHLPlaces.initCheckboxes, 500);
        GHLPlaces.waitForElements();
    },

    waitForElements: function() {
        GHLPlaces.customInput = document.getElementById('custom-address-input');
        GHLPlaces.ghlInput = document.getElementById('address');

        if (!GHLPlaces.customInput || !GHLPlaces.ghlInput) {
            setTimeout(GHLPlaces.waitForElements, 200);
            return;
        }

        GHLPlaces.waitForGoogle();
    },

    waitForGoogle: function() {
        if (window.google && google.maps && google.maps.places && google.maps.places.AutocompleteSuggestion) {
            GHLPlaces.setupAutocomplete();
        } else {
            setTimeout(GHLPlaces.waitForGoogle, 200);
        }
    },

    setupAutocomplete: function() {
        if (GHLPlaces.setupComplete) return;

        // Create suggestions container
        GHLPlaces.suggestionsContainer = document.createElement('div');
        GHLPlaces.suggestionsContainer.className = 'ghl-address-suggestions';
        GHLPlaces.suggestionsContainer.style.cssText = 'position:absolute;background:#fff;border:1px solid #ccc;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:99999999;display:none;max-height:300px;overflow-y:auto;width:100%;left:0;top:100%;';
        
        GHLPlaces.customInput.parentNode.style.position = 'relative';
        GHLPlaces.customInput.parentNode.appendChild(GHLPlaces.suggestionsContainer);

        // Create session token
        GHLPlaces.sessionToken = new google.maps.places.AutocompleteSessionToken();

        // Add event listeners
        GHLPlaces.customInput.addEventListener('input', GHLPlaces.handleInput);
        GHLPlaces.customInput.addEventListener('blur', GHLPlaces.handleBlur);
        GHLPlaces.customInput.addEventListener('focus', GHLPlaces.handleFocus);

        GHLPlaces.setupComplete = true;
        console.log('GHL Places Autocomplete initialized');
    },

    handleInput: function() {
        clearTimeout(GHLPlaces.debounceTimer);
        var query = GHLPlaces.customInput.value;

        // Sync to hidden GHL field
        GHLPlaces.ghlInput.value = query;

        if (query.length < 3) {
            GHLPlaces.suggestionsContainer.style.display = 'none';
            return;
        }

        GHLPlaces.debounceTimer = setTimeout(GHLPlaces.fetchSuggestions, 300);
    },

    handleBlur: function() {
        setTimeout(GHLPlaces.hideSuggestions, 200);
    },

    handleFocus: function() {
        if (GHLPlaces.suggestionsContainer.children.length > 0 && GHLPlaces.customInput.value.length >= 3) {
            GHLPlaces.suggestionsContainer.style.display = 'block';
        }
    },

    hideSuggestions: function() {
        if (GHLPlaces.suggestionsContainer) {
            GHLPlaces.suggestionsContainer.style.display = 'none';
        }
    },

    fetchSuggestions: function() {
        var query = GHLPlaces.customInput.value;
        if (!query || query.length < 3) return;

        var request = {
            input: query,
            sessionToken: GHLPlaces.sessionToken,
            includedPrimaryTypes: ['street_address', 'premise', 'subpremise', 'route'],
            includedRegionCodes: ['us']
        };

        google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request)
            .then(GHLPlaces.displaySuggestions)
            .catch(GHLPlaces.handleError);
    },

    handleError: function(error) {
        console.log('Autocomplete error:', error);
        GHLPlaces.suggestionsContainer.style.display = 'none';
    },

    displaySuggestions: function(response) {
        var suggestions = response.suggestions;
        GHLPlaces.suggestionsContainer.innerHTML = '';

        if (!suggestions || suggestions.length === 0) {
            GHLPlaces.suggestionsContainer.style.display = 'none';
            return;
        }

        // Store suggestions for later reference
        GHLPlaces.suggestionsContainer.suggestions = suggestions;

        for (var i = 0; i < suggestions.length; i++) {
            var div = document.createElement('div');
            div.style.cssText = 'padding:12px 16px;cursor:pointer;border-bottom:1px solid #eee;font-family:inherit;font-size:14px;background:#fff;';
            div.textContent = suggestions[i].placePrediction.text.text;
            div.setAttribute('data-index', i);
            div.addEventListener('mouseenter', GHLPlaces.handleSuggestionHover);
            div.addEventListener('mouseleave', GHLPlaces.handleSuggestionLeave);
            div.addEventListener('mousedown', GHLPlaces.handleSuggestionClick);
            GHLPlaces.suggestionsContainer.appendChild(div);
        }

        GHLPlaces.suggestionsContainer.style.display = 'block';
    },

    handleSuggestionHover: function() {
        this.style.backgroundColor = '#f5f5f5';
    },

    handleSuggestionLeave: function() {
        this.style.backgroundColor = '#fff';
    },

    handleSuggestionClick: function(e) {
        e.preventDefault();
        var index = parseInt(this.getAttribute('data-index'));
        var suggestion = GHLPlaces.suggestionsContainer.suggestions[index];
        GHLPlaces.selectSuggestion(suggestion);
    },

    selectSuggestion: function(suggestion) {
        var place = suggestion.placePrediction.toPlace();
        
        place.fetchFields({ fields: ['formattedAddress', 'addressComponents'] })
            .then(GHLPlaces.handlePlaceResult.bind(null, place))
            .catch(GHLPlaces.handleError);
    },

    handlePlaceResult: function(place) {
        var formattedAddress = place.formattedAddress;

        // Update custom input
        GHLPlaces.customInput.value = formattedAddress;

        // Update hidden GHL input
        GHLPlaces.ghlInput.value = formattedAddress;

        // Trigger events for GHL's Vue binding
        var inputEvt = document.createEvent('HTMLEvents');
        inputEvt.initEvent('input', true, true);
        GHLPlaces.ghlInput.dispatchEvent(inputEvt);

        var changeEvt = document.createEvent('HTMLEvents');
        changeEvt.initEvent('change', true, true);
        GHLPlaces.ghlInput.dispatchEvent(changeEvt);

        // Hide suggestions
        GHLPlaces.suggestionsContainer.style.display = 'none';

        // Get new session token
        GHLPlaces.sessionToken = new google.maps.places.AutocompleteSessionToken();
    },

    // Checkbox click area fix - using event delegation
    initCheckboxes: function() {
        document.addEventListener('click', function(e) {
            var container = e.target.closest('.terms-and-conditions');
            if (!container) { return; }
            if (e.target.type === 'checkbox') { return; }
            var checkbox = container.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                var evt = document.createEvent('HTMLEvents');
                evt.initEvent('change', true, true);
                checkbox.dispatchEvent(evt);
            }
        });
        console.log('Checkbox delegation ready');
    },

};

// Initialize
GHLPlaces.init();

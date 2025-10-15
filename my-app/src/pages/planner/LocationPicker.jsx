import React, { useState, useEffect, useRef } from "react";
import { GoogleMap } from "@react-google-maps/api";
import { useGoogleMapsLoader } from "./GoogleMapsLoader.js";
import "./LocationPicker.css";

const containerStyle = { width: "100%", height: "300px" };

const LocationPicker = ({
  initialLocation = null,
  initialAddress = "",
  onLocationChange,
  disabled = false,
}) => {
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [address, setAddress] = useState(initialAddress);
  const [currentLocation, setCurrentLocation] = useState(null);

  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteRef = useRef(null);
  const placesServiceRef = useRef(null);

  const { isLoaded, loadError } = useGoogleMapsLoader();

  // Get user location (initial)
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentLocation(loc);
        if (!initialLocation) {
          setSelectedLocation(loc);
          reverseGeocode(loc);
        }
      },
      (err) => console.error("Error getting location:", err)
    );
  }, [initialLocation]);

  // Initialize Places Service when map is loaded
  useEffect(() => {
    if (isLoaded && mapRef.current && window.google) {
      placesServiceRef.current = new window.google.maps.places.PlacesService(mapRef.current);
    }
  }, [isLoaded, mapRef.current]);

  // Initialize the autocomplete element once Maps API is loaded
  useEffect(() => {
    if (!isLoaded || !window.google || !window.google.maps.places) return;

    const initAutocomplete = async () => {
      try {
        // Import the places library
        const { BasicPlaceAutocompleteElement } = await window.google.maps.importLibrary('places');

        if (autocompleteRef.current) return; // Already initialized

        // Create the autocomplete element using the constructor
        const autocompleteEl = new BasicPlaceAutocompleteElement();
        
        if (disabled) {
          autocompleteEl.disabled = true;
        }

        // Set location bias if we have a current location
        if (currentLocation || selectedLocation) {
          autocompleteEl.locationBias = currentLocation || selectedLocation;
        }

        // Handle place selection
        autocompleteEl.addEventListener("gmp-select", async (event) => {
          const placeId = event.place.id;
          
          if (!placeId || !placesServiceRef.current) {
            console.error("No place ID or Places Service not initialized");
            return;
          }

          // Fetch place details using the place ID
          const request = {
            placeId: placeId,
            fields: ['geometry', 'formatted_address', 'name']
          };

          placesServiceRef.current.getDetails(request, (place, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
              if (place.geometry?.location) {
                const coords = {
                  lat: place.geometry.location.lat(),
                  lng: place.geometry.location.lng(),
                };

                const formattedAddress = place.formatted_address || place.name || "";

                setSelectedLocation(coords);
                setAddress(formattedAddress);

                if (mapRef.current) {
                  mapRef.current.panTo(coords);
                  if (place.geometry.viewport) {
                    mapRef.current.fitBounds(place.geometry.viewport);
                  }
                }

                // Call the parent callback
                if (onLocationChange) {
                  onLocationChange({
                    coordinates: coords,
                    address: formattedAddress,
                  });
                }
              }
            } else {
              console.error("Place details request failed:", status);
            }
          });
        });

        autocompleteRef.current = autocompleteEl;
        
        // Find the container and append
        const container = document.getElementById("autocomplete-container");
        if (container) {
          container.innerHTML = "";
          container.appendChild(autocompleteEl);
        }
      } catch (error) {
        console.error("Error initializing autocomplete:", error);
      }
    };

    initAutocomplete();

    return () => {
      if (autocompleteRef.current) {
        autocompleteRef.current.remove();
        autocompleteRef.current = null;
      }
    };
  }, [isLoaded, disabled, currentLocation, selectedLocation]);

  // Update marker on map
  useEffect(() => {
    if (!isLoaded || !window.google || !mapRef.current || !selectedLocation) return;

    // Remove existing marker
    if (markerRef.current) {
      if (markerRef.current.setMap) {
        markerRef.current.setMap(null);
      }
      markerRef.current = null;
    }

    try {
      // Try to use AdvancedMarkerElement if available
      if (window.google.maps.marker?.AdvancedMarkerElement) {
        markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
          map: mapRef.current,
          position: selectedLocation,
        });
      } else {
        // Fallback to regular Marker
        const marker = new window.google.maps.Marker({
          map: mapRef.current,
          position: selectedLocation,
          draggable: !disabled,
        });

        if (!disabled) {
          marker.addListener("dragend", (e) => {
            const coords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
            setSelectedLocation(coords);
            reverseGeocode(coords);
          });
        }

        markerRef.current = marker;
      }
    } catch (error) {
      console.error("Error creating marker:", error);
    }
  }, [selectedLocation, isLoaded, disabled]);

  // Reverse geocoding for address from coordinates
  const reverseGeocode = async (coords) => {
  if (!window.google || !window.google.maps) return;

  try {
    // Import the geocoding library dynamically
    const { Geocoder } = await window.google.maps.importLibrary("geocoding");
    const geocoder = new Geocoder();

    const { results } = await geocoder.geocode({ location: coords });

    if (results && results[0]) {
      const formattedAddress = results[0].formatted_address;
      setAddress(formattedAddress);

      if (onLocationChange) {
        onLocationChange({
          coordinates: coords,
          address: formattedAddress,
        });
      }
    }
  } catch (err) {
    console.error("Geocoding failed:", err);
  }
};

  const handleMapClick = (e) => {
    if (disabled || !window.google) return;
    const coords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setSelectedLocation(coords);
    reverseGeocode(coords);
    if (mapRef.current) {
      mapRef.current.panTo(coords);
    }
  };

  if (loadError) {
    return (
      <section className="location-picker-error">
        Error loading Google Maps. Please check your API key and try again.
      </section>
    );
  }

  if (!isLoaded) {
    return (
      <section className="location-picker-loading">
        Loading map...
      </section>
    );
  }

  return (
    <section className="location-picker">
      <section className="search-container">
        <label htmlFor="location-search">Location</label>
        <section id="autocomplete-container" className="autocomplete-container" />
      </section>

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={selectedLocation || currentLocation || { lat: 0, lng: 0 }}
        zoom={selectedLocation || currentLocation ? 15 : 2}
        onClick={handleMapClick}
        onLoad={(map) => {
          mapRef.current = map;
          // Initialize Places Service when map loads
          if (window.google) {
            placesServiceRef.current = new window.google.maps.places.PlacesService(map);
          }
        }}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          mapId: "a13cbaeb1f3ee8fcee081cc1",
        }}
      />

      {selectedLocation && address && (
        <section className="selected-location-info">
          <p>
            <strong>Selected:</strong> {address}
          </p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>
            Lat: {selectedLocation.lat.toFixed(6)}, Lng: {selectedLocation.lng.toFixed(6)}
          </p>
        </section>
      )}

      {!disabled && (
        <section className="location-instructions">
          Search for a location above or click on the map to select
        </section>
      )}
    </section>
  );
};

export default LocationPicker;
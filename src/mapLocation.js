/* -*- Mode: JS2; indent-tabs-mode: nil; js2-basic-offset: 4 -*- */
/* vim: set et ts=4 sw=4: */
/*
 * Copyright (c) 2011, 2012, 2013 Red Hat, Inc.
 *
 * GNOME Maps is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by the
 * Free Software Foundation; either version 2 of the License, or (at your
 * option) any later version.
 *
 * GNOME Maps is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with GNOME Maps; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 *
 * Author: Zeeshan Ali (Khattak) <zeeshanak@gnome.org>
 */

const Clutter = imports.gi.Clutter;
const Champlain = imports.gi.Champlain;
const Geocode = imports.gi.GeocodeGlib;

const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Signals = imports.signals;

const Utils = imports.utils;
const Path = imports.path;
const _ = imports.gettext.gettext;

const MapLocation = new Lang.Class({
    Name: 'MapLocation',

    _init: function(geocodeLocation, mapView) {
        this._mapView = mapView;
        this._view = mapView.view;
        this.latitude = geocodeLocation.latitude;
        this.longitude = geocodeLocation.longitude;
        this.description = geocodeLocation.description;
        this.accuracy = geocodeLocation.accuracy;
    },

    goTo: function(animate) {
        log("Going to " + this.description);

        let zoom = Utils.getZoomLevelForAccuracy(this.accuracy);

        if (!animate) {
            this._view.center_on(this.latitude, this.longitude);
            this._view.set_zoom_level(zoom);

            return;
        }

        /* Lets first ensure that both current and destination location are visible
         * before we start the animated journey towards destination itself. We do this
         * to create the zoom-out-then-zoom-in effect that many map implementations
         * do. This not only makes the go-to animation look a lot better visually but
         * also give user a good idea of where the destination is compared to current
         * location.
         */
        let locations = new Array();
        locations[0] = new Geocode.Location({ latitude: this._view.get_center_latitude(),
                                              longitude: this._view.get_center_longitude() });
        locations[1] = this;

        let animCompletedId = this._view.connect("animation-completed", Lang.bind(this,
            function() {
                this._view.disconnect(animCompletedId);
                animCompletedId = this._view.connect("animation-completed::go-to", Lang.bind(this,
                    function() {
                        this._view.disconnect(animCompletedId);
                        this._view.set_zoom_level(zoom);
                        this.emit('gone-to');
                    }));
                this._view.go_to(this.latitude, this.longitude);
            }));
        this._mapView.ensureVisible(locations);
    },

    show: function(layer) {
        let marker = new Champlain.Label();
        marker.set_text(this.description);
        marker.set_location(this.latitude, this.longitude);
        layer.add_marker(marker);
        log("Added marker at " + this.latitude + ", " + this.longitude);
    },

    showNGoTo: function(animate, layer) {
        this.show(layer);
        this.goTo(animate);
    },
});
Signals.addSignalMethods(MapLocation.prototype);

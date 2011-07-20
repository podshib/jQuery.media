/**
 * $media (timeline module) jQuery plugin (v.1.0)
 *
 * 2011. Created by Oscar Otero (http://oscarotero.com)
 *
 * $media is released under the GNU Affero GPL version 3.
 * More information at http://www.gnu.org/licenses/agpl-3.0.html
 */


(function($) {

	//sort object
	var sortObject = function (o) {
		var sorted = {}, key, keys = [];

		for (key in o) {
			if (o.hasOwnProperty(key)) {
				keys.push(key);
			}
		}

		keys.sort(function (a, b) {
			return a - b;
		});

		for (key = 0; key < keys.length; key++) {
			sorted[keys[key]] = o[keys[key]];
		}

		return sorted;
	}

	$media.prototype.channels = {
		timeline: {
			enabled: true
		}
	};

	/**
	 * function createChannel (channel, [options])
	 *
	 * Create a new channel
	 */
	$media.prototype.createChannel = function (channel, options) {
		if (!channel || this.channels[channel]) {
			return false;
		}

		if (typeof options != 'object') {
			options = {enabled: options ? true : false}
		}

		this.channels[channel] = options;
	}


	/**
	 * function removeChannel (channel)
	 *
	 * Remove a channel
	 */
	$media.prototype.removeChannel = function (channel) {
		if (!channel || !this.channels[channel]) {
			return false;
		}

		if ($.isFunction(this.channels[channel].remove)) {
			$.proxy(this.channels[channel].remove, this)(channel);
		}

		delete this.channels[channel];
	}


	/**
	 * function enableChannel (channel, [enable])
	 *
	 * Get/set the enabled and disabled channels
	 */
	$media.prototype.enableChannel = function (channel, enable) {
		if (channel == undefined) {
			return this;
		}

		enable = enable ? true : false;
		var refresh = false;

		if (typeof channel == 'string') {
			if (this.channels[channel]) {
				if (this.channels[channel].enabled != enable) {
					if (enable && $.isFunction(this.channels[channel].enable)) {
						$.proxy(this.channels[channel].enable, this)(channel);
					} else if (!enable && $.isFunction(this.channels[channel].disable)) {
						$.proxy(this.channels[channel].disable, this)(channel);
					}

					this.channels[channel].enabled = enable;
					refresh = true;
				}
			}

		} else if ($.isArray(channel)) {
			for (k in channel) {
				if (this.channels[channel[k]]) {
					if (this.channels[channel[k]].enabled != enable) {
						if (enable && $.isFunction(this.channels[channel[k]].enable)) {
							$.proxy(this.channels[channel[k]].enable, this)(channel[k]);
						} else if (!enable && $.isFunction(this.channels[channel[k]].disable)) {
							$.proxy(this.channels[channel[k]].disable, this)(channel[k]);
						}

						this.channels[channel[k]].enabled = enable;
						refresh = true;
					}
				}
			}

		} else if (typeof channel == 'object') {
			for (k in channel) {
				if (this.channels[k]) {
					var enable = channel[k] ? true : false;
					
					if (this.channels[k].enabled != enable) {
						if (enable && $.isFunction(this.channels[k].enable)) {
							$.proxy(this.channels[k].enable, this)(k);
						} else if (!enable && $.isFunction(this.channels[k].disable)) {
							$.proxy(this.channels[k].disable, this)(k);
						}
						this.channels[k].enabled = enable;
						refresh = true;
					}
				}
			}
		}

		if (refresh) {
			this.refreshTimeline();
		}

		return this;
	}
	
	
	/**
	 * function enabledChannel (channel)
	 *
	 * Return true if the channel is enabled
	 */
	$media.prototype.enabledChannel = function (channel) {
		if (!this.channels[channel] || !this.channels[channel].enabled) {
			return false;
		}

		return true;
	}


	/**
	 * function timeline (time, fn)
	 * function timeline (time)
	 *
	 * Insert a function in media timeline
	 */
	$media.prototype.timeline = function (time, fn, channel) {
		if (!this.timeline_data) {
			this.timeline_data = {
				timeout: false,
				points: {},
				active_points: [],
				remaining_points: [],
				remaining_outpoints: []
			};

			//Timeline functions
			this.bind('mediaPlay mediaSeek', function() {
				this.executeTimeline();
			});
			this.seeking(function(event, time) {
				this.executeTimelineOutPoints(time * 1000);
			});
		}

		var this_time = time;
		var this_fn = fn;
		var this_channel = channel;

		this.totalTime(function () {
			var points = [];

			if ($.isArray(this_time)) {
				points = this_time;
				this_channel = this_fn;
			} else if (typeof this_time == 'object') {
				points = [this_time];
				this_channel = this_fn;
			} else if ($.isFunction(this_fn)) {
				points[0] = {
					time: this_time,
					fn: this_fn
				};
			}

			this_channel = this_channel ? this_channel : 'timeline';

			var length = points.length;

			if (!length) {
				console.error('There is nothing to add to timeline');
				return this;
			}

			for (var i = 0; i < length; i++) {
				if ($.isArray(points[i].time)) {
					var ms = [
						Math.round(this.time(points[i].time[0]) * 1000),
						Math.round(this.time(points[i].time[1]) * 1000)
					];
				} else {
					var ms = [Math.round(this.time(points[i].time) * 1000)];
					ms.push(ms[0]);
				}

				points[i].ms = ms;

				var channel = points[i].channel ? points[i].channel : this_channel;

				if (!this.channels[channel]) {
					console.error(channel + ' is not a valid channel');
					continue;
				}

				if (this.timeline_data.points[channel] == undefined) {
					this.timeline_data.points[channel] = {};
				}

				if (this.timeline_data.points[channel][ms[0]] == undefined) {
					this.timeline_data.points[channel][ms[0]] = [];
				}

				this.timeline_data.points[channel][ms[0]].push(points[i]);
			}

			this.refreshTimeline();
		});

		return this;
	}


	/**
	 * function refreshTimeline ()
	 *
	 * Set the active_timeline_points array
	 */
	$media.prototype.refreshTimeline = function () {
		this.timeline_data.active_points = [];
		var active_points = {};

		for (channel in this.channels) {
			if (!this.channels[channel].enabled) {
				continue;
			}

			for (ms in this.timeline_data.points[channel]) {
				if (active_points[ms] == undefined) {
					active_points[ms] = [];
				}

				for (p in this.timeline_data.points[channel][ms]) {
					var point = this.timeline_data.points[channel][ms][p];
					point.channel = channel;
					active_points[ms].push(point);
				}
			}
		}

		active_points = sortObject(active_points);

		for (ms in active_points) {
			for (p in active_points[ms]) {
				this.timeline_data.active_points.push(active_points[ms][p]);
			}
		}

		this.executeTimeline();
	}


	/**
	 * function getPoints (second, [channels], [length])
	 *
	 * Get the timeline points from/to any time
	 */
	$media.prototype.getPoints = function (second, reverse, channels, offset, length) {
		if (second == undefined) {
			second = this.time();
		}

		var ms = Math.round(second * 1000);
		var active_timeline_points = [];

		if (channels) {
			if (!$.isArray(channels)) {
				channels = [channels];
			}

			for (k in this.timeline_data.active_points) {
				if ($.inArray(this.timeline_data.active_points[k].channel, channels) != -1) {
					active_timeline_points.push(this.timeline_data.active_points[k]);
				}
			}
		} else {
			$.merge(active_timeline_points, this.timeline_data.active_points);
		}

		if (!active_timeline_points.length) {
			return [];
		}

		var returned_points = [];

		if (reverse) {
			for (k in active_timeline_points) {
				if (ms > active_timeline_points[k].ms[1]) {
					returned_points.push(active_timeline_points[k]);
				}
			}

			returned_points.reverse();
		} else {
			for (k in active_timeline_points) {
				if (ms < active_timeline_points[k].ms[1]) {
					returned_points.push(active_timeline_points[k]);
				}
			}
		}

		if (typeof offset != 'number') {
			return returned_points;
		}

		if (typeof length == 'number') {
			return returned_points.slice(offset, offset + length);
		}

		return returned_points.slice(offset);
	}


	//Execute out functions
	$media.prototype.executeTimelineOutPoints = function (ms) {
		if (!this.timeline_data.remaining_outpoints.length) {
			return;
		}

		for (s in this.timeline_data.remaining_outpoints) {
			if (ms < this.timeline_data.remaining_outpoints[s].ms[0] || ms > this.timeline_data.remaining_outpoints[s].ms[1] || !this.channels[this.timeline_data.remaining_outpoints[s].channel].enabled) {
				this.executeTimelinePoint(this.timeline_data.remaining_outpoints[s], 'fn_out');
				this.timeline_data.remaining_outpoints[s].waiting = false;
				this.timeline_data.remaining_outpoints.splice(s, 1);
			}
		}
	}


	$media.prototype.executeTimelinePoint = function (point, fn) {
		if (!fn) {
			fn = 'fn';
		}

		if (!$.isFunction(point[fn])) {
			console.error('There is not function to execute in timeline');
			return false;
		}

		if (!$.isArray(point.data)) {
			point.data = (point.data == undefined) ? [] : [point.data];
		}

		if (!point.proxy) {
			point.proxy = this;
		}

		point[fn].apply(point.proxy, $.merge([point.ms[0]], point.data));
	}


	/**
	 * function executeTimeline ()
	 *
	 * Execute the timeline functions
	 */
	$media.prototype.executeTimeline = function () {
		if (!this.timeline_data.active_points.length && !this.timeline_data.remaining_points.length && !this.timeline_data.remaining_outpoints.length) {
			return;
		}

		//Get tmp_timeline (from now to the end)
		this.timeline_data.remaining_points = this.getPoints(this.time());

		if (!this.timeline_data.remaining_points.length && !this.timeline_data.remaining_outpoints.length) {
			return;
		}

		this.timelineTimeout();
	}


	/**
	 * function timelineTimeout ()
	 *
	 * Function to execute on timeOut
	 */
	$media.prototype.timelineTimeout = function () {
		if (!this.timeline_data.remaining_points.length && !this.timeline_data.remaining_outpoints.length) {
			return;
		}

		//Execute functions
		var ms = this.time() * 1000;

		while (this.timeline_data.remaining_points[0] && this.timeline_data.remaining_points[0].ms[0] <= ms) {
			var point = this.timeline_data.remaining_points.shift();

			if (!point.waiting) {
				this.executeTimelinePoint(point);

				if ($.isFunction(point.fn_out)) {
					point.waiting = true;
					this.timeline_data.remaining_outpoints.push(point);
				}
			}
		}

		//Execute out functions
		this.executeTimelineOutPoints(ms);

		//Create other timeout
		if (this.element.paused || this.element.seeking || (!this.timeline_data.remaining_points.length && !this.timeline_data.remaining_outpoints.length)) {
			return;
		}

		var new_ms = 0;

		if (this.timeline_data.remaining_points[0]) {
			new_ms = this.timeline_data.remaining_points[0].ms[0];
		}

		if (this.timeline_data.remaining_outpoints.length) {
			for (n in this.timeline_data.remaining_outpoints) {
				if (!new_ms || this.timeline_data.remaining_outpoints[n].ms[1] < new_ms) {
					new_ms = this.timeline_data.remaining_outpoints[n].ms[1];
				}
			}
		}
		
		new_ms = (new_ms - ms) + 10;

		if (new_ms < 20) {
			new_ms = 20;
		}

		clearTimeout(this.timeline_data.timeout);
		this.timeline_data.timeout = setTimeout($.proxy(this.timelineTimeout, this), new_ms);
	}
})(jQuery);
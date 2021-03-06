'use strict';

define([
	'jquery',
	'./media'
], function ($, Media) {

	var captureMouse = function (e) {
		this.pause();

		if (e.altKey) {
			this.seek('-0.2');
			this.$element.data('tweenCapture').points.pop();
			return false;
		}

		if (e.shiftKey) {
			var statusPoint = prompt('Status point');

			if (statusPoint !== null) {
				this.$element.data('tweenCapture').statusPoint = statusPoint;
			}
		}

		var tweenCapture = this.$element.data('tweenCapture');
		var offset = this.$element.offset();
		var point = {
			"ms": Media.secondsTo(this.time(), 'ms'),
			"status": this.$element.data('tweenCapture').statusPoint,
			"coords": [
				Math.round((((e.pageX - offset.left) * 100) / this.width()) * 100) / 100,
				Math.round((((e.pageY - offset.top) * 100) / this.height()) * 100) / 100
			]
		};

		tweenCapture.points.push(point);

		if ($.isFunction(tweenCapture.click)) {
			tweenCapture.click.call(this, point);
		}

		this.seek('+0.2');

		return false;
	};

	//Extends $media class
	Media.extend({
		captureTweenStart: function (settings) {
			this.pause();
			settings = settings || {};

			this.$element.data('tweenCapture', {
				points: [],
				status: '',
				statusPoint: 'play',
				click: settings.click
			});

			this.on('click', captureMouse);

			return this;
		},

		captureTweenPause: function (callback) {
			if (this.captureTweenStarted()) {
				this.pause();

				this.$element.data('tweenCapture').status = 'pause';

				this.off('click', captureMouse);

				if ($.isFunction(callback)) {
					callback.call(this, this.$element.data('tweenCapture').points);
				}
			}

			return this;
		},

		captureTweenResume: function (callback) {
			if (this.captureTweenStarted()) {
				this.pause();

				this.on('click', captureMouse);

				if ($.isFunction(callback)) {
					callback.call(this, this.$element.data('tweenCapture').points);
				}
			}

			return this;
		},

		captureTweenStop: function (callback) {
			this.captureTweenPause(callback);

			this.$element.removeData('tweenCapture');

			return this;
		},

		captureTweenStarted: function () {
			return (this.$element.data('tweenCapture') === undefined) ? false : true;
		},

		captureTweenPaused: function () {
			if (this.captureTweenStarted() && this.$element.data('tweenCapture').status === 'pause') {
				return true;
			}

			return false;
		}
	});
});
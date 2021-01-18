// just the BGA Counter with ints replaced by floats

    define(["dojo", "dojo/_base/declare"], function (dojo, declare) {
        return declare("forex.fcounter", null, {
            constructor: function () {
                this.span = null;
                this.current_value = 0;
                this.target_value = 0;
                this.speed = 100;
            },
            create: function (id) {
                if (typeof id == "string") {
                    id = $(id);
                }
                this.span = id;
                this.span.innerHTML = this.current_value;
            },
            getValue: function () {
                return this.target_value;
            },
            setValue: function (value) {
                this.current_value = parseFloat(value);
                this.target_value = parseFloat(value);
                this.span.innerHTML = this.current_value;
            },
            toValue: function (value) {
                this.target_value = parseFloat(value);
                if (this.current_value != this.target_value) {
                    dojo.addClass(this.span, "counter_in_progress");
                }
                setTimeout(dojo.hitch(this, this.makeCounterProgress), this.speed);
            },
            incValue: function (val) {
                this.toValue(parseFloat(this.target_value) + parseFloat(val));
                return this.target_value;
            },
            disable: function () {
                this.span.innerHTML = "-";
            },
            makeCounterProgress: function () {
                if (this.current_value == this.target_value) {
                    setTimeout(dojo.hitch(this, this.finishCounterMove), 1000);
                    return;
                }
                var diff = Math.abs(this.target_value - this.current_value);
                var increment = Math.min(Math.ceil(diff / 5), diff);
                if (this.current_value < this.target_value) {
                    this.current_value += increment;
                } else {
                    this.current_value -= increment;
                }
                this.span.innerHTML = this.current_value;
                setTimeout(dojo.hitch(this, this.makeCounterProgress), this.speed);
            },
            finishCounterMove: function () {
                if (this.current_value == this.target_value) {
                    dojo.removeClass(this.span, "counter_in_progress");
                }
            },
        });
    });

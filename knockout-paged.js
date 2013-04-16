/*
knockout-paged.js - A Pager Plugin for Knockout.JS
Written By: Leland M. Richardson



Desired API:

    .paged(Number pageSize);
        assumes static data, creates pager with given pageSize

    .paged(Number pageSize, String url);
        assumes `url` is an AJAX endpoint which returns the requested data with
        url parameters "pg" and "perPage"

    .paged(Object config);
        pass config object with optional + required parameters (most flexible)


    Object Configuration:
    .paged({
        pageSize: Number (10),
        cached: Boolean (true),


        url: String


    });


 */



;(function(ko){

    // module scope
    var extend = ko.utils.extend;

    var config_init = function(defaults,a,b){

        var cfg = extend({},defaults);

        if(typeof a === "Number"){
            // pageSize passed as first param
            cfg.pageSize = a;
        }
        if(typeof b === "String"){
            cfg.url = b;
            cfg.async = true;
        }

        return cfg;
    };

    var _defaults = {

    };

    var paged = function(a,b){
        var items = this;

        //config initialization
        var cfg = config_init(_defaults,a,b);


        items.current = ko.observable(1);
        items.perPage = perPage;
        items.pagedItems = ko.computed(function(){
            var pg = this.current(),
                start = this.perPage * (pg-1),
                end = start + this.perPage;
            return this().slice(start,end);
        }, items);

        items.next = function(){
            if(this.next.enabled())
                this.current(this.current()+1);
        }.bind(this);

        items.next.enabled = ko.computed(function(){
            return this().length > this.perPage * this.current();
        },items);

        items.prev = function(){
            if(this.prev.enabled())
                this.current(this.current()-1);
        }.bind(this);

        items.prev.enabled = ko.computed(function(){
            return this.current() > 1;
        },items);


        return items;
    };

    paged.defaultOptions = _defaults;



}(ko));
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

    //todo: perhaps some "inf-scroll" type functionality?

    Object Configuration:
    .paged({
        pageSize: Number (10),
        cached: Boolean (true),


        url: String


    });


 */



;(function(ko,$){

    // module scope


    // UTILITY METHODS
    // ----------------------------------------------------
    var extend = ko.utils.extend;

    // simple string replacement
    var tmpl = function(str, obj) {
        for (var i in obj) {
            if (obj.hasOwnProperty(i) !== true) continue;

            // convert to string
            var value = obj[i] + '';

            str = str.replace(new RegExp('{' + regexEscape(i) + '}', 'g'), value);
        }
        return str;
    };

    // construct url with proper data
    var construct_url = function(template,pg,pageSize){
        var start = pageSize * (pg-1),
            end = start + pageSize;
        return tmpl(template,{pg: pg, pageSize: pageSize, start: start, end: end});
    };

    //constructor mapping function...
    var cmap = function(array,Ctor){
        return $.map(array,function(el){
            return new Ctor(el)
        });
    };

    // constructs the config object for each isntance based on parameters
    var config_init = function(defaults,a,b,c){

        var cfg = extend({},defaults);

        if(typeof a === "Number"){
            // pageSize passed as first param
            cfg.pageSize = a;

            if(typeof b === "String"){
                cfg.url = b;
                cfg.async = true;
            }
        } else {
            extend(cfg,a);
        }

        return cfg;
    };

    var _defaults = {
        pageSize: 10,
        async: false,

        // async only options
        getPage: null,
        url: null, // TODO: allow this to be a function?
        ctor: null, //constructor to be used for
        ajaxOptions: {},


    };

    var paged = function(a,b){
        var items = this;

        // config initialization
        var cfg = config_init(_defaults,a,b),

        // current page
        current = ko.observable(1),

        pagedItems = ko.computed(function(){
            var pg = current(),
                start = cfg.pageSize * (pg-1),
                end = start + cfg.pageSize;
            return this().slice(start,end);
        }, items);

        // array of loaded
        var loaded = [];
        var isLoading = ko.observable(true);


        // next / previous / goToPage methods

        var goToPage = cfg.async ? function(pg){
            if(loaded[pg]){
                //data is already loaded. change page in setTimeout to make async
                isLoading(true);
                setTimeout(function(){
                    current(pg);
                },0);
            } else {
                // user has specified URL. make ajax request
                $.ajax(extend({
                    url: construct_url(cfg.url, pg, cfg.pageSize),
                    success: function(res){
                        //todo: provide some way for user to override this
                        if(cfg.mapFromServer){
                            res = cfg.mapFromServer(res);
                        }
                        onPageReceived(res);
                    }
                },cfg.ajaxOptions));

            }
        } : current; // if not async, all we need to do is assign pg to current

        var onPageReceived = function(pg,data){
            // if constructor passed in, map data to constructor
            if(cfg.ctor !== null){
                data = cmap(data,cfg.ctor);
            }
            // append data to items array
            Array.prototype.push.apply(items(),data);
            items.current(pg);
        };

        var next = function(){
            if(this.next.enabled())
                goToPage(this.current()+1);
        }.bind(items);

        next.enabled = ko.computed(function(){
            return this().length > this.perPage * this.current();
        },items);

        var prev = function(){
            if(this.prev.enabled())
                goToPage(this.current()-1);
        }.bind(items);

        prev.enabled = ko.computed(function(){
            return this.current() > 1;
        },items);



        // exported properties
        extend(items,{
            current: current,
            pagedItems: pagedItems,
            pageSize: cfg.pageSize,
            isLoading: isLoading, // might not need this if not async?
        });

        // return target
        return items;
    };

    paged.defaultOptions = _defaults;



}(ko,$));
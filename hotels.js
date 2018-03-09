var hotelModel = Backbone.Model.extend({
    initialize: function(){}
});

var restaurantModel = Backbone.Model.extend({
    initialize: function(){}
});

var hotelCollection = Backbone.Collection.extend({
    model: hotelModel,    
    initialize: function(){},
    
    parse: function(response) {
        return response.data;
    }
});

var restaurantCollection = Backbone.Collection.extend({
    model: restaurantModel,
    initialize: function(){}
});

var paginatedCollection = hotelCollection.extend({
    paginate: function() {
        var pageSet,
            collectionLength = this.length,
            pageOffset = 10;   
        
        collectionLength > pageOffset ? (
            pageSet = this.slice(0,10)
            ) : (
            pageSet = this.slice()
            );
           
        var page = this.remove(pageSet);
        
        return page;
    }
});

HotelsBaseView = Backbone.View.extend({
    templates: {
        'property_wrapper': Handlebars.templates['hotels_by_category/properties'],
        'property_count': Handlebars.templates['hotels_by_category/property_count'],

    },

    events: {
        'click input' : 'updateFilterObj',
        'change select' : 'updateFilterObj',
        'click button#loadMore' : function (event) {
            this.paginateData(event);
            this.hideLoadMore(event);
        }
    },

    setRegion: function (obj) {
        if (obj.country) {
            this.region = obj.country;
        }
        else {
            this.region = 'Worldwide';
        }
        return this.region;
    },
    
    sortData: function (collection) {
        var pageSize = 10;
        var sorted = collection.sortBy(function (asset) {
            return -asset.get('ah_rating');
        });

        this.paginatedCollection.reset(sorted);
        var filter_count = this.paginatedCollection.length;

        $('#properties-list').html('');

        filter_count > pageSize ? (
            $('button#loadMore').show()
            ) : (
            $('button#loadMore').hide()
            );
            
        $('#property-count').html(this.templates.property_count({
            'filter_count': filter_count,
            'region' : this.region,
            'sourcePage': this.sourcePage
        }));        
        
        this.paginateData();
    },

    fetchData: function (asset_list) {
        var self = this;

        $('#partner-count').html(this.prop_count);

        return this.collection.fetch({data:{'asset_list': asset_list.join(',')}});
    },

    addPage: function() {
        var scrollTop = $(window).scrollTop(),
            winHeight = $(window).height(),
            divTop = $('#properties-list').offset().top,
            divHeight = $('#properties-list').outerHeight(),
            isClicked = $('button#loadMore').hasClass('clicked');
        
        if ((scrollTop > (divTop + divHeight - winHeight)) && (isClicked)) {
            this.paginateData();
        }
    },  

    paginateData: function() {
        var page = this.paginatedCollection.paginate();
        this.render(page);
    },

    hideLoadMore: function() {
        $('button#loadMore').hide().addClass('clicked');
    },

    render: function (collection) {
        _.each(collection, function (model) {
            var propertyview = new PropertyView({
                model: model
            });       
            $('#properties-list').append(propertyview.render().el);         
        });
    },

    updateFilterObj: function (event) {
        var $target = $(event.target);
        var val = $target.data('type');
        var filterObj = this.activeFilters;
        var newFilterObj = {};
        var text = $target.val();

        _.mapObject(filterObj, function (v,k) {
            if (k == val) {
                if (_.isBoolean(v)) {
                    v = !v;
                    filterObj[k] = v;
                }
                else {
                    filterObj[k] = text;
                }
            }
        });
        
        _.extend(newFilterObj, filterObj);
        
        this.createFilter(newFilterObj);
    },

    createFilter: function (filterObj) {
        _.each(filterObj, function (v,k) {
            if (v == 'All') {
                v = false;
                filterObj[k] = v;
            }
        });
        var filter = _.omit(filterObj, function (v,k) {
            return v == false;
        });

        this.filterData(filter);
    },  

    filterData: function (filter) {
        this.setRegion(filter);
        var filtered;
        var hotels = this.collection;
        filtered = hotels.where(filter);
        
        if (filter.tags) {
            var categories = new hotelCollection();
            _.each(hotels.models, function(model) {
                if (_.contains(model.attributes.tags, filter.tags)) {
                    categories.add(model);
                }
            });

            delete filter.tags;
            filtered = categories.where(filter);
        }

        var hotelcollection = new hotelCollection(filtered);
        this.updateCheckBoxes(hotelcollection);
        this.sortData(hotelcollection);
    },

    updateCheckBoxes: function (collection) {
        var filter_auctions, filter_benefits, filter_offers;
        _.each(collection.models, function (model) {
            if (model.attributes.has_auctions) filter_auctions = true;
            if (model.attributes.has_offers) filter_offers = true;
            if (model.attributes.is_alliance) filter_benefits = true;

        });

        if (filter_auctions) {
            $('input.filter[data-type="has_auctions"]').removeAttr('disabled');
        } else {
            $('input.filter[data-type="has_auctions"]').attr('disabled', 'disabled');
        }
        if (filter_offers) {
            $('input.filter[data-type="has_offers"]').removeAttr('disabled');
        } else {
            $('input.filter[data-type="has_offers"]').attr('disabled', 'disabled');
        }
        if (filter_benefits) {
            $('input.filter[data-type="is_alliance"]').removeAttr('disabled');
        } else {
            $('input.filter[data-type="is_alliance"]').attr('disabled', 'disabled');
        }

    },

    updateDropDowns: function (collection) {
        var filter_regions = [];
        var filter_categories = [];
        var defaultVal = 'All';
        var $region_default = $("<option selected></option>").text(defaultVal);
        var $category_default = $("<option selected></option>").text(defaultVal);
        this.setRegionsAndCategories(collection,filter_regions,filter_categories);
        filter_regions.sort();

        $('#region-list').html('');
        $('#region-list').html($region_default);

        $('#category-list').html('');
        $('#category-list').html($category_default);
        
        _.each(filter_regions, function (region) {
            $region_option = $("<option></option>").text(region);
            $("#region-list").append($region_option);
        });

        _.each(filter_categories, function (category) {
            $category_option = $("<option></option>").text(category);
            $("#category-list").append($category_option);
        });
    },


});

HotelsByDestinationView = HotelsBaseView.extend({
    initialize: function (options) {
        this.el = options.el;
        this.asset_list = options.data;
        this.sourcePage = options.sourcePage;
        this.dest_name = options.dest_name;
        this.child_regions = options.child_regions;
        this.prop_count = this.asset_list.length
        this.collection = new hotelCollection();
        this.paginatedCollection = new paginatedCollection();
        this.collection.url = '/travel/get_assets_by_list/';
        this.region;
        
        _.bindAll(this, 'addPageDest', 'createMap', 'addPins');

        $(window).scroll(this.addPageDest);

        this.activeFilters = {
            'has_auctions': false,
            'has_offers': false,
            'is_alliance': false,
            'tags': 'All',
            'country': 'All'
        };
        
        this.el.html(this.templates.property_wrapper({
            'sourcePage' : this.sourcePage,
            'dest_name' : this.dest_name
        }));
        
        var self = this;

        this.createMap();
        
        this.fetchData(this.asset_list).done(function () {
            self.addPins(self.collection);
            self.updateDropDowns(self.collection);
            self.updateCheckBoxes(self.collection);            
            self.filterData({});
        });
    },

    createMap: function() {
        var self = this;
        L.mapbox.config.FORCE_HTTPS = true;
        L.mapbox.accessToken = 'pk.eyJ1IjoiaXNlbnRpbGxlcyIsImEiOiIzTjRXWTN3In0.3YOp2MrUh13yiB_My5XV6A';
    
        this.map = L.mapbox.map('hotel-map', 'isentilles.c36fd2da', {
            maxBounds: [[120, -240], [-120, 240]],
        });
    
        //turn off scroll zoom
        this.map.scrollWheelZoom.disable();
        // Disable tap handler, if present.
        if (this.map.tap) {
            //turn off dragging on touch
            this.map.dragging.disable();
            this.map.tap.disable();
        }
    
        var $mainBody = $('#main-body-wrapper');
        //fullscreen map button
        $('[data-activate="hotels-map"]').on('click',function(){
            if ($mainBody.hasClass("active")) {
                $mainBody.removeClass("active");
                self.map.scrollWheelZoom.disable();
                // Disable tap handler, if present.
                if (self.map.tap) {
                     //turn off dragging on touch
                    self.map.dragging.disable();
                }
            } else {
                $mainBody.addClass("active");
                self.map.scrollWheelZoom.enable();
                // Disable tap handler, if present.
                if (self.map.tap) {
                    //turn off dragging on touch
                    self.map.dragging.enable();
                }
            }
            setTimeout(function(){
                self.map.invalidateSize(false);
                self.map.fitBounds(self.hotelsLayer.getBounds());
            },10);
        });
    },

    addPins: function (hotels) {
        var self = this;
        var mapData = [];
    
        if (hotels) {
            //load the map
            _.each(hotels.models, function(prop){
                if(prop.attributes.is_alliance){
                    is_alliance = 1;
                }else{
                    is_alliance = 0;
                }
                if(!isNaN(prop.attributes.longitude) && !isNaN(prop.attributes.latitude) && ((prop.attributes.longitude != '') && (prop.attributes.longitude != ''))) {
                    mapData.push({
                        "name": "<a href='https://www.andrewharper.com/hotels/" + prop.attributes.slug + "' class='no-highlight'>" + prop.attributes.title + "</a>",
                        "longitude": prop.attributes.longitude,
                        "latitude": prop.attributes.latitude,
                        "alliance": is_alliance
                    });
                }
            });
        } else {
            return;
        }
    
        this.map.legendControl.addLegend($('#legend').html());
    
        var myLayer = L.mapbox.featureLayer().addTo(this.map);
        var myGeo = [];
    
        //make a cluster layer out of the data
        this.hotelsLayer = L.markerClusterGroup({
            showCoverageOnHover: false,
            disableClusteringAtZoom: 13,
            maxClusterRadius: 40,
            spiderfyDistanceMultiplier: 0.2
        });
    
        var counts_properties_map = 0;
    
        $.each(mapData,function(i,val){
    
            if(val.alliance){
                var tIcon = L.mapbox.marker.icon({
                    'marker-symbol': 'hospital',
                    'marker-color': '3d8e33'
                });
            }else{
                var tIcon = L.mapbox.marker.icon({
                    'marker-color': '3d8e33'
                });
            }
    
            var tMarker = L.marker(new L.LatLng(val.latitude,val.longitude),{
                title: val.name,
                icon: tIcon,
                description: val.description,
                alliance: val.alliance,
            });
    
            tMarker.bindPopup(val.name);
    
            self.hotelsLayer.addLayer(tMarker);
    
            counts_properties_map++;
    
        });
    
        this.map.addLayer(this.hotelsLayer);
        //add the geoData into the layer
    
        //see if we just have one
        if(counts_properties_map === 1){
            this.hotelsLayer.eachLayer(function(m){
                self.map.setView(m.getLatLng(),11);
                m.openPopup();
            });
            // Hide Loader
            $('#map_loader').css({'display':'none'}).hide();
        } else {
            this.map.fitBounds(this.hotelsLayer.getBounds());
            // Hide Loader
            $('#map_loader').css({'display':'none'}).hide();
        }
    
        this.hotelsLayer.on('click', function(e){
            self.map.panTo(e.layer.getLatLng());
        })
    
    },

    setAttributes: function (child_regions) {
        var self = this;
        _.each(this.collection.models, function (model) {
            var country = _.intersection(model.attributes.region, child_regions);
            model.set({'country': country[0]});
        });
    },

    setRegionsAndCategories: function (collection, filter_regions, filter_categories) {
        _.each(this.child_regions, function (model) {
            filter_regions.push(model.name);
        });

        _.each(collection.models, function (model) {
            var tags = model.attributes.tags;
            _.each(tags, function(category) {
                if (filter_categories.indexOf(category) == -1) {
                    filter_categories.push(category);
                }
            });
        });
        this.setAttributes(filter_regions);
    },

    addPageDest: function() {
        var scrollTop = $(window).scrollTop(),
            winHeight = $(window).height(),
            divTop = $('#properties-list').offset().top,
            divHeight = $('#properties-list').outerHeight(),
            isClicked = $('button#loadMore').hasClass('clicked');
        
        if ($('a[href="#hotels"]').hasClass('active')) {    
            if ((scrollTop > (divTop + divHeight - winHeight)) && (isClicked)) {
                this.paginateData();
            }
        }
    }  
});
HotelsByCategoryView = HotelsBaseView.extend({    
    initialize: function (options) {
        this.el = options.el;
        this.asset_list = options.data;
        this.sourcePage = options.sourcePage;
        this.dest_name = options.dest_name;
        this.child_regions = options.child_regions;
        this.prop_count = this.asset_list.length
        this.collection = new hotelCollection();
        this.paginatedCollection = new paginatedCollection();
        this.collection.url = '/travel/get_assets_by_list/';
        this.region;
        
        _.bindAll(this, 'addPage');

        $(window).scroll(this.addPage);

        this.activeFilters = {
            'has_auctions': false,
            'has_offers': false,
            'is_alliance': false,
            'tags': 'All',
            'country': 'All'
        };
        
        this.el.html(this.templates.property_wrapper({
            'sourcePage' : this.sourcePage,
            'dest_name' : this.dest_name
        }));
        
        var self = this;
        
        this.fetchData(this.asset_list).done(function () {
            self.updateDropDowns(self.collection);
            self.updateCheckBoxes(self.collection);
            self.filterData({});
        });
    },

    setRegionsAndCategories: function (collection, filter_regions) {
        _.each(collection.models, function (model) {
            if (!filter_regions.includes(model.attributes.country)) {
                filter_regions.push(model.attributes.country);
            }
        });
    }          
});

var RestaurantListView = HotelsBaseView.extend({
    templates: {
        'restaurant_list': Handlebars.templates['hotels_by_category/restaurant-list'],
        'restaurant_heading': Handlebars.templates['hotels_by_category/restaurant_heading']
    },

    events: {
        'click button#loadMoreRest' : function (event) {
            this.paginateRest(event);
            this.hideLoadMoreRest(event);
        }
    },
    
    initialize: function(options) {
        this.restaurants = options.restaurants;
        this.el = options.el;
        this.dest_name = options.dest_name;
        this.paginatedCollection = new paginatedCollection();
        this.restaurantCounter = 0;
    
         _.bindAll(this, 'addPageRest');

        $(window).scroll(this.addPageRest);

        this.el.html(this.templates.restaurant_list({}));
        $('#restaurantList').html(this.templates.restaurant_heading({
            'dest_name': this.dest_name
        }));

        this.sortRest(this.restaurants);
    },

    sortRest: function(data) {
        var sorted = _.sortBy(data, 'city');
        this.paginatedCollection.set(sorted);
        this.paginateRest();
    },

    paginateRest: function () {
        var page = this.paginatedCollection.paginate();
        this.renderRestaurants(page);
    },

    hideLoadMoreRest: function() {
        $('button#loadMoreRest').hide().addClass('clicked');
    },

    addPageRest: function() {
        var scrollTop = $(window).scrollTop(),
            winHeight = $(window).height(),
            divTop = $('#restaurantList').offset().top,
            divHeight = $('#restaurantList').outerHeight(),
            isClicked = $('button#loadMoreRest').hasClass('clicked');
        
        if ($('a[href="#restaurants"]').hasClass('active')) {    
            if ((scrollTop > (divTop + divHeight - winHeight)) && (isClicked)) {
                this.paginateRest();
            }
        }
    },  

    renderRestaurants: function(collection) {
        var self = this;
        
        _.each(collection, function(model) {
            self.restaurantCounter++;
            var restaurant = new RestaurantView({
                model: model.attributes,
            });
            
            restaurant.model['restCount'] = self.restaurantCounter;
            
            $('#restaurantList').append(restaurant.render().el);
        });
    }   
});

var PropertyView = Backbone.View.extend({
    template: Handlebars.templates['hotels_by_category/properties-list'],
    className: 'row property-list-wrapper',

    render: function() {
        this.$el.html(this.template(this.model.attributes)).hide().fadeIn(1500);
        return this;
    }
});

var RestaurantView = Backbone.View.extend({
    template: Handlebars.templates['hotels_by_category/restaurant'],
    render: function() {
        this.$el.html(this.template(this.model)).hide().fadeIn(1500);
        return this;
    }
});

Handlebars.registerHelper('compare', function (v1, operator, v2, options) {
    var bool = false;
    if (operator == '==') {
        bool = v1 == v2;
    }
    
    if (bool) {
        return options.fn(this);
    }
    else {
        return options.inverse(this);
    }
});
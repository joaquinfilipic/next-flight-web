/* TODO: Check if can make AJAX return values asynchronically */
/* TODO: Check state problem with flights */

/* JQuery after-load functions */
$("document").ready(function() {

  $.ajaxSetup({
       cache: false
  });

  if (window.location.pathname=="/ofertas.html"){
    load_offers_objects(true);
  }else if (window.location.pathname=="/nosotros.html"){
    savePageState("Nosotros","nosotros.html","nosotros");
  }else if (window.location.pathname=="/contacto.html"){
    savePageState("Contacto","contacto.html","contacto");
  }else if (window.location.pathname=="/pag_opiniones.html"){
    load_items_opinions();
  }else{
    load_home_objects(false);

    load_offers_2(true);
  }
});

function load_home_objects(save_state){
  /* Datepickers */
  $( ".datepicker" ).removeClass("hasDatepicker");
  $( ".datepicker" ).datepicker();
  $( ".datepicker" ).datepicker( "option", "dateFormat", "yy-mm-dd" );

  /* The form does not refresh after pressing the submit button */
  $("form").submit(function(e) {
      e.preventDefault();
  });

  $( ".place-input" ).autocomplete({
    source: function( request, response ) {
      var places = getPlacesFromAPI(request.term);
      $.when(places).done(function(my_response){
        response(getPlacesNames(my_response.data))
      });
    }
  });

  $(".radio-option").on('change', function(){
    var value1 = $("#ida").prop("checked");
    var value2 = $("#idayvuelta").prop("checked");

    if ( value1 ){
      $("#date-regreso").prop("disabled", true);
      $( "#date-regreso" ).datepicker( "option", "disabled", true );
    }else if (value2){
      $("#date-regreso").prop("disabled", false);
      $( "#date-regreso" ).datepicker( "option", "disabled", false );
    }
  });

  if (save_state){
    $('#offers').ready(function(){
      savePageState("Home","index.html","home");
    });
  }

  loadTextResults();

}

function load_radio_sort(){
  $(".sort-flights").on('change', function() {
    var value = JSON.parse(sessionStorage.getItem("return"));
    var values = getValues();
    var comparators = getComparators();

    if (value) {
      var tuples = JSON.parse(sessionStorage.getItem("tuples"));
      for (i = 0; i < values.length; i++) {
        if (values[i] == true) {
          tuples = tupleSort(tuples, comparators[Math.floor(i / 2)], i % 2);
        }
      }
      $('#flights').empty();
      saveTupleStorage(0,5,tuples);
      fillTuples(5,0);
      return;
    }

    else {
      var flight_data = JSON.parse(sessionStorage.getItem("flight_data_global"));
      var sort_keys = ["fare", "duration", "airline"];
      var sort_orders = ["asc", "desc"];
      var sort_key;
      var sort_order;

      for (i = 0; i < values.length; i++) {
        if (values[i] == true) {
          sort_key = sort_keys[Math.floor(i / 2)];
          sort_order = sort_orders[i % 2];
        }
      }

      var source_id = flight_data.source_id;
      var destiny_id = flight_data.destiny_id;
      var departure_date = flight_data.departure_date;
      var return_date = flight_data.return_date;
      var adults = flight_data.adults;
      var children = flight_data.children;
      var infants = flight_data.infants;

      var get_flights = getSortedFlightFromAPI(source_id,destiny_id,departure_date,adults,children,infants,sort_key,sort_order);

      var load_template = $.ajax({
        url: "./resultados_template.html",
        dataType: "text"
      });

      $.when(load_template).done(function(response){
        $("#modifiable-panel").html(response);
        $.when(get_flights).done(function(data1,success1,err1){
          if (success1 != "success"){
            fillError("#unknown-error","Ahora no se pudo realizar la solicitud. Por favor, intentelo más tarde.");
            return;
          }
          $('#flights').empty();
          //saveFlightStorage(0,5,data1);
          fillFlightsOneWay(5,0);
        });
      });
    }
  });
}

function load_offers_2(save_state){
  sessionStorage.setItem("offers?","true");
  if ( save_state){
    $('#offers').ready(function(){
      savePageState("Home","index.html","home");
    });
  }
  if (navigator.geolocation){
    navigator.geolocation.getCurrentPosition(function(position){
      if ( JSON.parse(sessionStorage.getItem("offers?"))){
        sessionStorage.setItem("offers?","false");
        var get_id = $.ajax({
          dataType: 'json',
          url:'http://hci.it.itba.edu.ar/v1/api/geo.groovy?method=getcitiesbyposition',
          data: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            radius: 100
          }
        });

        var offer_template = $.ajax({
                dataType: 'text',
                url: './offer_template.html',
              });

        $.when(offer_template).done(function(offer_template,suc_temp,error_temp){
          if(suc_temp != "success"){
            fillError("#unknown-error","Ahora no se pudo realizar la solicitud. Por favor, intentelo más tarde.");
            return;
          }
          $.when(get_id).done(function(data_id,success,error){
            if(data_id.error != undefined || data_id.cities.length == 0){
              fillError("#unknown-error","Ahora no se pudo realizar la solicitud. Por favor, intentelo más tarde.");
              return;
            }
            var OFFER_SIZE = 12;
            var name = data_id.cities[0].name
            var id = data_id.cities[0].id;

            var get_deals= getDeals(id);

            $.when(get_deals).done(function(data_request, suc_req,error_req){
              if(data_request == undefined || data_request.error != undefined){
                fillError("#unknown-error","Ahora no se pudo realizar la solicitud. Por favor, intentelo más tarde.");
                return;
              }
              sessionStorage.setItem("local_deal_city",JSON.stringify(name));
              sessionStorage.setItem("local_deals",JSON.stringify(data_request.deals));
              for (j = 0 ; j < OFFER_SIZE && j < data_request.deals.length ; j++ ){
                var longitude = data_request.deals[j].city.longitude;
                var latitude = data_request.deals[j].city.latitude;
                var options = {
                  Origen : name,
                  Destino: data_request.deals[j].city.name,
                  Precio: data_request.deals[j].price,
                  Number: j
                };
                var photos_request = getPhotos(longitude,latitude,1,options,offer_template,(j==OFFER_SIZE-1|| j==data_request.deals.length -1),save_state);
              }

            });

          });
        });
      }
    },showErrorGL);
  }else{
    fillError("#unknown-error","Su navegador no es compatible o no tiene habilitada la geolocalización.");
    return;
  }
}
/*
function load_offers(){

  var cities_req = getAllCities();
  var offer_template = $.ajax({
          dataType: 'text',
          url: './offer_template.html',
        });
  $.when(cities_req).done(function(data_cities,success,error){
    if(data_cities.error != undefined){
      fillError("#unknown-error","Ahora no se pudo realizar la solicitud. Por favor, intentelo más tarde.");
      return;
    }
    $.when(offer_template).done(function(offer_template,suc_temp,error_temp){
      if(suc_temp != "success"){
        fillError("#unknown-error","Ahora no se pudo realizar la solicitud. Por favor, intentelo más tarde.");
        return;
      }
      var OFFER_SIZE = 12;
      var request = [];

      for ( i = 0 ; i < OFFER_SIZE ; i++ ){
        var random_city = Math.floor(Math.random() * data_cities.cities.length);
        var id = data_cities.cities[random_city].id;
        var obj_request = {
          name : data_cities.cities[random_city].name,
          request : getDeals(id)
        }
        request.push(obj_request);
      }

      for ( j = 0 ; j < OFFER_SIZE ; j++){
          $.when(request[j].request).done(function(data_request, suc_req,error_req){
            if(data_request == undefined || data_request.error != undefined){
              fillError("#unknown-error","Ahora no se pudo realizar la solicitud. Por favor, intentelo más tarde.");
              return;
            }

            var random_offer = Math.floor(Math.random() * data_request.deals.length);

            var longitude = data_request.deals[random_offer].city.longitude;
            var latitude = data_request.deals[random_offer].city.latitude;

            var options = {
              Origen : request[j].name,
              Destino: data_request.deals[random_offer].city.name,
              Precio: data_request.deals[random_offer].price,
            };

            var photos_request = getPhotos(longitude,latitude,1,options,offer_template,j==OFFER_SIZE-1);

          });
      }

    });
  });
}*/

/* Ajax Request */
var getPlacesFromAPI = function(source){
  return $.ajax({
      url: "http://hci.it.itba.edu.ar/v1/api/geo.groovy?method=getcitiesandairportsbyname",
      data: {
        name : source
      },
      dataType: "json",
    });
}

var getAirlinesByNameFromAPI = function(airline) {
  return $.ajax({
    url: "http://hci.it.itba.edu.ar/v1/api/misc.groovy?method=getairlinesbyname",
    data: {
      name: airline
    },
    dataType: "json",
  });
}

var getSortedFlightFromAPI = function(var_from, var_to, var_dep_date, var_adults, var_children, var_infants, var_sort_key, var_sort_order){
  return $.ajax({
      url: "http://hci.it.itba.edu.ar/v1/api/booking.groovy?method=getonewayflights",
      data: {
        from :    var_from,
        to :      var_to,
        dep_date :var_dep_date,
        adults :  var_adults,
        children: var_children,
        infants : var_infants,
        sort_key: var_sort_key,
        sort_order: var_sort_order
      },
      dataType: "json"
    });
}

var getFlightFromAPI = function(var_from, var_to, var_dep_date, var_adults, var_children, var_infants, var_cabin_type, var_airline_id){
  return $.ajax({
      url: "http://hci.it.itba.edu.ar/v1/api/booking.groovy?method=getonewayflights",
      data: {
        from :    var_from,
        to :      var_to,
        dep_date :var_dep_date,
        adults :  var_adults,
        children: var_children,
        infants : var_infants,
        cabin_type: var_cabin_type,
        airline_id: var_airline_id
      },
      dataType: "json"
    });
}

var getAllCities = function(){
  return $.ajax({
      url: "http://hci.it.itba.edu.ar/v1/api/geo.groovy?method=getcities",
      dataType: "json",
    });
}

var getAllAirports = function(){
  return $.ajax({
      url: "http://hci.it.itba.edu.ar/v1/api/geo.groovy?method=getairports",
      dataType: "json",
    });
}

var getDeals = function(from_id){
  return $.ajax({
    url: "http://hci.it.itba.edu.ar/v1/api/booking.groovy?method=getflightdeals",
    async: false,
    data: {
      from : from_id
    },
    dataType: "json"
    });
}

var getPhotos = function(long,lat,distance,options,offer_template,last,save_state){
  var photo_request = $.ajax({
        url: "http://www.panoramio.com/map/get_panoramas.php",
        async: false,
        type: "GET",
        data: {
            set: 'public',
            'from': 0,
            'to': 20,
            'minx': long - distance,
            'miny': lat - distance,
            'maxx': long + distance,
            'maxy': lat + distance,
            'size': 'medium',
            'mapfilter': 'true'
        },
        dataType: "jsonp"
    });

    $.when(photo_request).done(function(data_photos,suc_photos,error_photos){
      if(data_photos == undefined || data_photos.error != undefined){
        fillError("#unknown-error","Ahora no se pudo realizar la solicitud. Por favor, intentelo más tarde.");
        return;
      }
      var img = new Image();
      img.src = photo_url;
      var photo_url = data_photos.photos[0].photo_file_url;
      options.URL = photo_url;
      var rendered = Mustache.render(offer_template, options);
      $('#offers').append(rendered);
      if ( last && save_state){
        $('#offers').ready(function(){
          replacePageState("Home","index.html","home");
        });
      }
    });

}

var getPhotos2 = function(long,lat,distance,options,offer_template){
  var photo_request = $.ajax({
        url: "http://www.panoramio.com/map/get_panoramas.php",
        type: "GET",
        data: {
            set: 'public',
            'from': 0,
            'to': 20,
            'minx': long - distance,
            'miny': lat - distance,
            'maxx': long + distance,
            'maxy': lat + distance,
            'size': 'medium',
            'mapfilter': 'true'
        },
        dataType: "jsonp"
    });

    $.when(photo_request).done(function(data_photos,suc_photos,error_photos){
      if(data_photos == undefined || data_photos.error != undefined){
        fillError("#unknown-error","Ahora no se pudo realizar la solicitud. Por favor, intentelo más tarde.");
        return;
      }
      var img = new Image();
      img.src = photo_url;
      var photo_url = data_photos.photos[0].photo_file_url;
      options.URL = photo_url;
      var rendered = Mustache.render(offer_template, options);
      $('#offers').append(rendered);
    });

}

function fillError(selector,text){
  $(selector).append(text+"<br/>");
  $(selector).show();
}

function flightsForm(){
  var source = document.forms["flights"]["origen-text-input"].value;
  var destiny = document.forms["flights"]["destino-text-input"].value;
  var departure_date = document.forms["flights"]["date-salida"].value;
  var return_date = document.forms["flights"]["date-regreso"].value;
  var adults = document.forms["flights"]["adultos"].value;
  var children = document.forms["flights"]["ninios"].value;
  var infants = document.forms["flights"]["infantes"].value;
  var cabin_type;
  var specified_airline;
  var specified_airline_id;
  if ($("#advanced-search").is(":visible")) {
    var cabin_type_raw = document.forms["flights"]["advanced-flight-class"].value;
    if (cabin_type_raw === "Economica") {
      cabin_type = "ECONOMY";
    }
    else if (cabin_type_raw === "Ejecutiva") {
      cabin_type = "BUSINESS";
    }
    else {
      cabin_type = "FIRST_CLASS";
    }

    specified_airline = document.forms["flights"]["advanced-airline"].value;
    if (specified_airline != "Todas"){
      airlines_list = getAirlinesByNameFromAPI(specified_airline);
      $.when(airlines_list).done(function(airlines){
        if (airlines == undefined){
          fillError("#unknown-error","Ahora no se pudo realizar la solicitud. Por favor, intentelo más tarde.");
          return;
        }
        else {
          specified_airline_id = airlines.airlines[0].id;
        }
      });
    }
  }

  var save_form_data = {
    source: source,
    destiny: destiny,
    departure_date: departure_date,
    return_date: return_date
  }

  var is_return = $("#idayvuelta").prop("checked");
  var data_for_request_ok = true;

  $("#flights").empty();
  $(".alert").empty();
  $(".alert").hide();

  changeBreadCrumb("#bc-results")
  if (source == destiny){
    fillError("#wrong-origen","El lugar de origen y de destino no pueden ser el mismo.");
    fillError("#wrong-destino","El lugar de origen y de destino no pueden ser el mismo.");
    data_for_request_ok = false;
  }

  if ( isNaN(Date.parse(departure_date))){
    fillError("#wrong-date-salida","La fecha no es válida");
    data_for_request_ok = false;
  }

  var oneDay = 24*60*60*1000; // hours*minutes*seconds*milliseconds
  var diffDays = Math.round((new Date(departure_date).getTime() - new Date().getTime())/(oneDay));
  if (diffDays < 2){
    fillError("#wrong-date-salida","La fecha debe ser dos días después de hoy.");
    data_for_request_ok = false;
  }

  if (is_return){
    if ( isNaN(Date.parse(return_date)) ){
      fillError("#wrong-date-regreso","La fecha no es válida");
      data_for_request_ok = false;
    }
    if (new Date(return_date) < new Date(departure_date)){
      fillError("#wrong-date-regreso","La fecha de partida debe ser menor a la de regreso.");
      fillError("#wrong-date-salida","La fecha de partida debe ser menor a la de regreso.");
      data_for_request_ok = false;
    }
  }

  var get_source = getPlacesFromAPI(encodeURI(source));
  var get_destiny = getPlacesFromAPI(encodeURI(destiny));

  var source_id;
  var destiny_id;

  $.when(get_source,get_destiny).done(function(data_source,data_destiny){
    if (data_source[1] != "success" || data_destiny[1] != "success"){
      fillError("#unknown-error","Ahora no se pudo realizar la solicitud. Por favor, intentelo más tarde.");
      return;
    }

    var index_source = getIndex(data_source[0].data,source);
    var index_destiny = getIndex(data_destiny[0].data,destiny);

    if (data_source[0].data.length < 1 || index_source == -1){
      fillError("#wrong-origen","Por favor, elija una opción de la lista.");
      data_for_request_ok = false;
    }else if (data_destiny[0].data.length < 1 || index_destiny == -1){
      fillError("#wrong-destino","Por favor, elija una opción de la lista.");
      data_for_request_ok = false;
    }

    if (!data_for_request_ok){
      fillPagination(0,10,0);
      return;
    }

    source_id = data_source[0].data[index_source].id;
    destiny_id = data_destiny[0].data[index_destiny].id;
    saveTextResults(save_form_data);

    var flight_data = {
      source_id : source_id,
      destiny_id : destiny_id,
      departure_date : departure_date,
      return_date : return_date,
      adults : adults,
      children : children,
      infants : infants,
      cabin_type: cabin_type,
      airline_id: specified_airline_id
    };

    sessionStorage.setItem("flight_data_global",JSON.stringify(flight_data));

    var get_flights_go = getFlightFromAPI(source_id,destiny_id,departure_date,adults,children,infants,cabin_type,specified_airline_id);
    var get_flights_return;
    if (is_return){
      get_flights_return = getFlightFromAPI(destiny_id,source_id,return_date,adults,children,infants,cabin_type,specified_airline_id);
    }
    //saveOfferState("Resultados","resultados");
    /* Change offer to answers */
    var load_template = $.ajax({
          url: "./resultados_template.html",
          dataType: "text"
        });

    showSorts();
    load_radio_sort();

    $.when(load_template).done(function(response){
      $("#modifiable-panel").html(response);
      $.when(get_flights_go).done(function(data1,success1,err1){
        if (success1 != "success"){
          fillError("#unknown-error","Ahora no se pudo realizar la solicitud. Por favor, intentelo más tarde.");
          return;
        }
        if (is_return){
          $.when(get_flights_return).done(function(data2,success2,err2){
            if (success2 != "success"){
              fillError("#unknown-error","Ahora no se pudo realizar la solicitud. Por favor, intentelo más tarde.");
              return;
            }
            var tuples = getTuples(data1,data2);
            saveTupleStorage(0,5,tuples);
            fillTuples(5,0);
            /*
            saveFlightStorage(0,5,data1,data2);
            fillFlightsBothWays(5,0);
            */
          });
        } else {
          saveFlightStorage(0,5,data1);
          fillFlightsOneWay(5,0);
        }
      });
    });

  });

};

function fillFlightsOneWay(page_size,page){
  var data = JSON.parse(sessionStorage.getItem("flights1"));
  if (data.flights.length == 0){
    $("#flights").prepend("<div class='alert alert-info'><a href=''#' class='close' data-dismiss='alert' aria-label='close'>&times;</a>No se encontraron resultados.</div>")
  }else{

    var request_template = $.ajax({
            dataType: 'text',
            url: './flight_template_one_way.html',
          });

    $.when(request_template).done(function(temp_data,success,err){
      for( i = page * page_size ; i < data.flights.length && i < (page+1) * page_size ; i++ ){
        var origin = data.flights[i].outbound_routes[0].segments[0].departure.airport.description;
        var destiny = data.flights[i].outbound_routes[0].segments[0].arrival.airport.description;
        var departure_time = data.flights[i].outbound_routes[0].segments[0].departure.date;
        var arrival_time = data.flights[i].outbound_routes[0].segments[0].arrival.date;
        var charges = data.flights[i].price.total.charges;
        var price = data.flights[i].price.total.taxes;
        var taxes = data.flights[i].price.total.fare;
        var total = data.flights[i].price.total.total;

		var duration = data.flights[i].outbound_routes[0].duration;
		var flight_number = data.flights[i].outbound_routes[0].segments[0].number;
		var flight_airline = data.flights[i].outbound_routes[0].segments[0].airline.name;
    var cabin_type = parseCabin(data.flights[i].outbound_routes[0].segments[0].cabin_type);
		var adults_price = data.flights[i].price.adults.base_fare;
    if (data.flights[i].price.children == undefined) {
      var children_price = " - - -";
    }else{
      var children_price = data.flights[i].price.children.base_fare;
    }
    if (data.flights[i].price.infants == undefined) {
      var infants_price = " - - -";
    }else{
      var infants_price = data.flights[i].price.infants.base_fare;
    }

        var options = {
          LugarOrigen: origin,
          LugarDestino: destiny,
          HoraPartida: departure_time,
          HoraLlegada: arrival_time,
          Cargos: charges,
          Precio: price,
          Impuestos: taxes,
          Total: total,
		      Aerolinea: flight_airline,
        Numero: flight_number,
        PAdulto: adults_price,
		    Duracion: duration,
		    PNiño: children_price,
        Clase: cabin_type,
		    PInfante: infants_price,
          Number: i
        };

        var rendered = Mustache.render(temp_data, options);
        $('#flights').append(rendered);
		    $('.flight-detail-class:last').attr('href','#flight-detail-' + i);
        $('.flight-detail-block-class:last').attr('id','flight-detail-' + i);
      }
      fillPagination(page,page_size,data.flights.length);
      $('#flights').ready(function(){
        saveSearchState("Resultados","");
      })
    });

  }
}

function fillTuples(page_size,page) {
  var tuples = JSON.parse(sessionStorage.getItem("tuples"));
  if (tuples.length == 0) {
    $("#flights").prepend("<div class='alert alert-info'><a href=''#' class='close' data-dismiss='alert' aria-label='close'>&times;</a>No se encontraron resultados.</div>");
  }
  else {
    var start_i = (page_size * page);
    var counter = 0;
    var request_template = $.ajax({
      dataType: 'text',
      url: './flight_template_two_way.html',
    });

    $.when(request_template).done(function(temp_data,success,err){
      for( i = start_i ; i < tuples.length && counter < page_size ; i++ ){
        var origin1 = tuples[i].go.outbound_routes[0].segments[0].departure.airport.description;
        var destiny1 = tuples[i].go.outbound_routes[0].segments[0].arrival.airport.description;
        var departure_time1 = tuples[i].go.outbound_routes[0].segments[0].departure.date;
        var arrival_time1 = tuples[i].go.outbound_routes[0].segments[0].arrival.date;
        var charges1 = tuples[i].go.price.total.charges;
        var price1 = tuples[i].go.price.total.taxes;
        var taxes1 = tuples[i].go.price.total.fare;
        var total1 = tuples[i].go.price.total.total;

    var cabin_type1 = parseCabin(tuples[i].go.outbound_routes[0].segments[0].cabin_type) ;
    var duration1 = tuples[i].go.outbound_routes[0].duration;
    var flight_number1 = tuples[i].go.outbound_routes[0].segments[0].number;
    var flight_airline1 = tuples[i].go.outbound_routes[0].segments[0].airline.name;
    var adults_price1 = tuples[i].go.price.adults.base_fare;
    if (tuples[i].go.price.children != undefined){
      var children_price1 = tuples[i].go.price.children.base_fare;
    }else{
      var children_price1 = "- - -";
    }
    if (tuples[i].go.price.infants != undefined){
      var infants_price1 = tuples[i].go.price.infants.base_fare;
    }else{
      var infants_price1 = "- - -";
    }

        var origin2 = tuples[i].return.outbound_routes[0].segments[0].departure.airport.description;
        var destiny2 = tuples[i].return.outbound_routes[0].segments[0].arrival.airport.description;
        var departure_time2 = tuples[i].return.outbound_routes[0].segments[0].departure.date;
        var arrival_time2 = tuples[i].return.outbound_routes[0].segments[0].arrival.date;
        var charges2 = tuples[i].return.price.total.charges;
        var price2 = tuples[i].return.price.total.taxes;
        var taxes2 = tuples[i].return.price.total.fare;
        var total2 = tuples[i].return.price.total.total;

    var cabin_type2 = parseCabin(tuples[i].return.outbound_routes[0].segments[0].cabin_type);
    var duration2 = tuples[i].return.outbound_routes[0].duration;
    var flight_number2 = tuples[i].return.outbound_routes[0].segments[0].number;
    var flight_airline2 = tuples[i].return.outbound_routes[0].segments[0].airline.name;
    var adults_price2 = tuples[i].return.price.adults.base_fare;
    if (tuples[i].go.price.children != undefined){
      var children_price2 = tuples[i].return.price.children.base_fare;
    }else{
      var children_price2 = "- - -";
    }
    if (tuples[i].go.price.infants != undefined){
      var infants_price2 = tuples[i].return.price.infants.base_fare;
    }else{
      var infants_price2 = "- - -";
    }

        var total3 = (total1+total2).toFixed(2);

        var options = {
            LugarOrigen: origin1,
            LugarDestino: destiny1,
            HoraPartida: departure_time1,
            HoraLlegada: arrival_time1,
            Cargos: charges1,
            Precio: price1,
            Impuestos: taxes1,
            Total: total1,
            Aerolinea: flight_airline1,
            Duracion: duration1,
            Numero: flight_number1,
            PAdulto: adults_price1,
            PNiño: children_price1,
            PInfante: infants_price1,
            Clase: cabin_type1,

            LugarOrigen2: origin2,
            LugarDestino2: destiny2,
            HoraPartida2: departure_time2,
            HoraLlegada2: arrival_time2,
            Cargos2: charges2,
            Precio2: price2,
            Impuestos2: taxes2,
            Total2: total2,
            Aerolinea2: flight_airline2,
            Duracion2: duration2,
            Numero2: flight_number2,
            PAdulto2: adults_price2,
            PNiño2: children_price2,
            PInfante2: infants_price2,
            Clase2: cabin_type2,

            SuperTotal: total3,
            Number: i
        };
        counter++;
        var rendered = Mustache.render(temp_data, options);
        $('#flights').append(rendered);
        $('.flight2i-detail-class:last').attr('href','#flight2i-detail-' + i);
        $('.flight2i-detail-block-class:last').attr('id','flight2i-detail-' + i);
        $('.flight2v-detail-class:last').attr('href','#flight2v-detail-' + i);
        $('.flight2v-detail-block-class:last').attr('id','flight2v-detail-' + i);
      }
      fillPagination(page,page_size,tuples.length);
      $('#flights').ready(function(){
        saveSearchState("Resultados","");
      })
    });
  }
}

function getPlacesNames(data){
  var answer = [];

  if ( data.length == 0 ){
    answer.push("No se encontraron resultados");
  }

  for ( i = 0; i < data.length ; i++ ){
    if (data[i].name != undefined){
      answer.push(decodeURI(data[i].name));
    }else{
      answer.push(decodeURI(data[i].description));
    }
  }

  return answer;
}

function getIndex(array,string){
  var my_string = encodeURI(string)
  for ( i = 0 ; i < array.length ; i++ ){
    if (string == array[i].name){
      return i;
    }else if(string == array[i].description){
      return i;
    }
  }
  return -1;
}

function saveOfferState(title,url){
  if (window.location.pathname == "/"){
    var data = {
      offer_html: $("#modifiable-panel").html(),
      last_url: ""+ window.location.pathname,
      page: "home"
    };
    history.pushState(data,title,url);
  }
}

function saveSearchState(title,url){
  var data = {
    offer_html: $("#modifiable-panel").html(),
    offer_all_panel: $("#modifiable-great-panel").html(),
    last_url: ""+ window.location.pathname,
    page: "resultados",
    return: sessionStorage.getItem("return"),
  };

  if (	JSON.parse(sessionStorage.getItem("return")) ){
    data.search_results = sessionStorage.getItem("tuples");
  }else{
    data.search_results = sessionStorage.getItem("flights1");
  }

  history.pushState(data,title,url);
}

function savePageState(title,url,page_name){
  var data = {
    offer_html: $("#modifiable-great-panel").html(),
    last_url: ""+ window.location.pathname,
    page: page_name
  };
  history.pushState(data,title,url);
}

function replacePageState(title,url,page_name){
  var data = {
    offer_html: $("#modifiable-great-panel").html(),
    last_url: ""+ window.location.pathname,
    page: page_name
  };
  history.replaceState(data,title,url);
}

function saveFlightStorage(page,page_size,flights1,flights2){
  sessionStorage.setItem("flights1",JSON.stringify(flights1));
  sessionStorage.setItem("return",false);
  sessionStorage.setItem("pageSize",JSON.stringify(page_size));
  sessionStorage.setItem("page",JSON.stringify(page));
}

function saveTupleStorage(page,page_size,tuples) {
	sessionStorage.setItem("tuples",JSON.stringify(tuples));
	sessionStorage.setItem("return",true);
	sessionStorage.setItem("pageSize",JSON.stringify(page_size));
	sessionStorage.setItem("page",JSON.stringify(page));
}

function fillPagination(page,pageSize,length){
  var pages = Math.ceil(length/pageSize);
  $('.pagination').empty();
  $('.pagination').append("<li><a href='javascript:previousPage()'><span class='glyphicon glyphicon-chevron-left'></span></a></li>");
  for(i = 0 ; i < pages; i++ ){
    if ( i == page){
      $('.pagination').append("<li class='active'><a href='javascript:goPage("+i+")'>"+(i+1)+"</a></li>");
    }else{
      $('.pagination').append("<li><a href='javascript:goPage("+i+")'>"+(i+1)+"</a></li>");
    }
  }
  $('.pagination').append("<li><a href='javascript:nextPage("+i+")'><span class='glyphicon glyphicon-chevron-right'></span></a></li>");
}

function goPage(page){
  $("#flights").empty();
  var page_size = JSON.parse(sessionStorage.getItem("pageSize"));
  var return_flight = JSON.parse(sessionStorage.getItem("return"));
  sessionStorage.setItem("page",JSON.stringify(page));
  if (!return_flight){
    fillFlightsOneWay(page_size,page);
  }else{
    fillTuples(page_size,page);
  }
}

function previousPage(){
  var page = JSON.parse(sessionStorage.getItem("page"));
  var page_size = JSON.parse(sessionStorage.getItem("pageSize"));
  var return_flight = JSON.parse(sessionStorage.getItem("return"));
  if (page != 0){
    $("#flights").empty();
    sessionStorage.setItem("page",JSON.stringify(page-1));
    if (!return_flight){
      fillFlightsOneWay(page_size,page-1);
    }else{
    	fillTuples(page_size,page-1);
    }
  }
}

function nextPage(lastPage){
  var page = JSON.parse(sessionStorage.getItem("page"));
  var page_size = JSON.parse(sessionStorage.getItem("pageSize"));
  var return_flight = JSON.parse(sessionStorage.getItem("return"));
  if (page != lastPage - 1){
    $("#flights").empty();
    sessionStorage.setItem("page",JSON.stringify(page+1));
    if (!return_flight){
      fillFlightsOneWay(page_size,page+1);
    }else{
      fillTuples(page_size,page+1);
      //fillFlightsBothWays(page_size,page+1);
    }
  }
}

// TODO: Change the inital savePageState
function contactButton(){
  $("#breadcrumb-ol").hide();
  changeTabs(undefined);
  var load_template = $.ajax({
        url: "./template_contacto.html",
        dataType: "text"
      });
  $.when(load_template).done(function(template){
    $("#modifiable-great-panel").html(template);
    savePageState("Contacto","contacto.html","contacto");
  });

}

function nosotrosButton(){
  $("#breadcrumb-ol").hide();
  changeTabs(undefined);
  var load_template = $.ajax({
        url: "./template_nosotros.html",
        dataType: "text"
      });
  $.when(load_template).done(function(template){
    $("#modifiable-great-panel").html(template);
    savePageState("Nosotros","nosotros.html","nosotros");
  });
}

function opinionesButton(){
  $("#breadcrumb-ol").hide();
  changeTabs("#opinion-tab");
  var load_template = $.ajax({
        url: "./template_opiniones.html",
        dataType: "text"
      });

  $.when(load_template).done(function(template){
    $("#modifiable-great-panel").html(template);
    $("#modifiable-great-panel").ready(function() {
      load_items_opinions(true);
    });
  });
}

function comprarButton(index){
  var load_template = $.ajax({
        url: "./template_info.html",
        dataType: "text"
      });
  changeBreadCrumb("#bc-info")

  var flight;
  if (	JSON.parse(sessionStorage.getItem("return")) ){
    flight = JSON.parse(sessionStorage.getItem("tuples"))[index];
  }else{
    flight = JSON.parse(sessionStorage.getItem("flights1")).flights[index];
  }

  sessionStorage.setItem("toBuyFlight",JSON.stringify(flight));

  $.when(load_template).done(function(template){
    $("#modifiable-great-panel").html(template);
    $("#modifiable-great-panel").ready(function() {
      load_information_items(true,false);
    });
  });
}

function puntuarButton(index,type){
  $("#breadcrumb-ol").hide();
  var load_template = $.ajax({
        url: "./template_puntuar.html",
        dataType: "text"
      });

  var data_flight;
  if (	JSON.parse(sessionStorage.getItem("return")) ){
    data_flight = JSON.parse(sessionStorage.getItem("tuples"))[index];
  }else{
    data_flight = JSON.parse(sessionStorage.getItem("flights1")).flights[index];
  }

  var score_flight;

  if (type === 'idayvuelta-ida'){
    score_flight = data_flight.go;
  }
  else if (type === 'idayvuelta-vuelta'){
    score_flight = data_flight.return;
  }
  else{
    score_flight = data_flight;
  }

  sessionStorage.setItem("toScoreFlight",JSON.stringify(score_flight));

  var options = {
    Numero: score_flight.outbound_routes[0].segments[0].number,
    Aerolinea: score_flight.outbound_routes[0].segments[0].airline.name,
    PrecioAdulto: score_flight.price.adults.base_fare,
    Origen: score_flight.outbound_routes[0].segments[0].departure.airport.city.name,
    Destino:  score_flight.outbound_routes[0].segments[0].arrival.airport.city.name,
    Clase: parseCabin(score_flight.outbound_routes[0].segments[0].cabin_type),
    DiaSalida: new Date(score_flight.outbound_routes[0].segments[0].departure.date).toLocaleString().substring(0,9),
    DiaLlegada: new Date(score_flight.outbound_routes[0].segments[0].arrival.date).toLocaleString().substring(0,9),
    HoraSalida: new Date(score_flight.outbound_routes[0].segments[0].departure.date).toTimeString().substring(0,5),
    HoraLlegada: new Date(score_flight.outbound_routes[0].segments[0].arrival.date).toTimeString().substring(0,5),
    Duracion: score_flight.outbound_routes[0].segments[0].duration
  }

  $.when(load_template).done(function(template){
    var rendered = Mustache.render(template, options);
    $("#modifiable-great-panel").html(rendered);
    $("#modifiable-great-panel").ready(function() {
      $("#review-info-vuelo-panel").show();
      load_puntuar_items(true);
    });
  });
}

function homeButton(){
  changeTabs("#home-tab");
  changeBreadCrumb("#bc-home");

  var load_template = $.ajax({
        url: "./template_index.html",
        dataType: "text"
      });

  $.when(load_template).done(function(template){
    $("#modifiable-great-panel").html(template);
    $("#modifiable-great-panel").ready(function() {
      load_home_objects(false);
      $("#modifiable-great-panel").ready(function() {
        load_offers_2(true);
      });
    });
  });
}

function offerButton(){
  $("#breadcrumb-ol").hide();
  changeTabs("#ofertas-tab");
  var load_template = $.ajax({
        url: "./template_ofertas.html",
        dataType: "text"
      });

  $.when(load_template).done(function(template){
    $("#modifiable-great-panel").html(template);
    $("#modifiable-great-panel").ready(function() {
      load_offers_objects(true);
    });
  });
}

// TODO: Change pushstate to the beginning.
window.onpopstate = function(event) {
  $(document).ready(function(){
    if (event.state.page == "home"){
      changeTabs("#home-tab");
      changeBreadCrumb("#bc-home");
      $("#modifiable-great-panel").html(event.state.offer_html);
      $.when("#modifiable-great-panel").done(function(){
        // TODO: Change this to have more options.
          $("document").ready(function() {
            load_home_objects(false);
          });
        });
    }else if ( event.state.page == "resultados"){
      changeBreadCrumb("#bc-results");
      changeTabs("#home-tab");
      if(document.getElementById("modifiable-panel")){
        $("#modifiable-panel").html(event.state.offer_html);
        $("#modifiable-great-panel").ready(function(){
          showSorts();
          if (	JSON.parse(event.state.return) ){
            sessionStorage.setItem("tuples",event.state.search_results);
          }else{
            sessionStorage.setItem("flights1",event.state.search_results);
          }
          sessionStorage.setItem("return",event.state.return);
          load_radio_sort();
        });
      } else {
        $("#modifiable-great-panel").html(event.state.offer_all_panel);
        $("#modifiable-great-panel").ready(function(){
          load_home_objects(false);
          showSorts();
          load_radio_sort();
        });
      }

    }else if (event.state.page == "opiniones-result" ){
      changeTabs("#opinion-tab");
      $("#breadcrumb-ol").hide();
      if(document.getElementById("modifiable-panel")){
        $("#modifiable-panel").html(event.state.offer_html);
        $("#modifiable-panel").ready(function(){
          load_items_opinions(false);
          sessionStorage.setItem("review-data",event.state.review_data)
        });
      } else {
        $("#modifiable-great-panel").html(event.state.offer_all_panel);
        $("#modifiable-great-panel").ready(function(){
          load_items_opinions(false);
        });
      }
    }else if(event.state.page=="opiniones"){
      $("#breadcrumb-ol").hide();
      changeTabs("#opinion-tab");
        $("#modifiable-great-panel").html(event.state.offer_html);
        $("#modifiable-great-panel").ready(function(){
          load_items_opinions(false);
        });
    }else if(event.state.page=="info"){
      changeBreadCrumb("#bc-info");
      changeTabs("#home-tab");
      $("#modifiable-great-panel").html(event.state.offer_html);
      $("#modifiable-great-panel").ready(function(){
        load_information_items(true,true);
      });
    }else if(event.state.page=="detalle"){
      changeBreadCrumb("#bc-validation");
      changeTabs("#home-tab");
      $("#modifiable-great-panel").html(event.state.offer_html);
      $("#modifiable-great-panel").ready(function(){

      });
    }else if(event.state.page=="puntuar"){
      $("#breadcrumb-ol").hide();
      changeTabs("#home-tab");
      $("#modifiable-great-panel").html(event.state.offer_html);
      $("#modifiable-great-panel").ready(function(){
        sessionStorage.setItem("toScoreFlight",event.state.score_flight);
        load_puntuar_items(false);
      });
    }else if(event.state.page=="ofertas"){
      $("#breadcrumb-ol").hide();
      changeTabs("#ofertas-tab");
      $("#modifiable-great-panel").html(event.state.offer_html);
      $("#modifiable-great-panel").ready(function(){
        load_offers_objects(false);
      });
    }else if(event.state.page=="ofertas_result"){
      $("#breadcrumb-ol").hide();
      changeTabs("#ofertas-tab");
      $("#modifiable-great-panel").html(event.state.offer_html);
      $("#modifiable-great-panel").ready(function(){
        load_offers_objects(false);
        if (event.state.offers != undefined){
          sessionStorage.setItem("deals",event.state.offers);
          sessionStorage.setItem("deal_city",event.state.deal_city);
        }
      });
    }else{
      $("#breadcrumb-ol").hide();
      $("#modifiable-great-panel").html(event.state.offer_html);
      $("#modifiable-great-panel").ready(function(){
        // TODO: Change this to have more options.
        changeTabs(undefined);
      });
    }
  });
  //history.replaceState(event.state,event.state.page,event.state.last_url);
};

function tupleSort(tuples, comparator, type) {
	var lowest_tuple;
	var lowest_index;
	var aux;
	for (i = 0; tuples[i] != undefined; i++) {
		lowest_tuple = tuples[i];
		lowest_index = i;
		for (j = i; tuples[j] != undefined; j++) {
			if (type == 0 && comparator(tuples[j], lowest_tuple) < 0) {
				lowest_tuple = tuples[j];
				lowest_index = j;
			}
			else if (type == 1 && comparator(tuples[j], lowest_tuple) > 0) {
				lowest_tuple = tuples[j];
				lowest_index = j;
			}
		}
		aux = tuples[i];
		tuples[i] = tuples[lowest_index];
		tuples[lowest_index] = aux;
	}
	return tuples;
}

var priceCmp = function(tuple1, tuple2) {
	var tuple1_price = tuple1.go.price.total.total + tuple1.return.price.total.total;
	var tuple2_price = tuple2.go.price.total.total + tuple2.return.price.total.total;

	if (tuple1_price < tuple2_price) {
		return -1;
	}
	else if (tuple1_price > tuple2_price) {
		return 1;
	}
	return 0;
}

var durationCmp = function(tuple1, tuple2) {
	var tuple1_go_duration = tuple1.go.outbound_routes[0].duration;
  var tuple1_return_duration = tuple1.return.outbound_routes[0].duration;
	var tuple2_go_duration = tuple2.go.outbound_routes[0].duration;
  var tuple2_return_duration = tuple2.return.outbound_routes[0].duration;

  var hours1_go = parseInt(tuple1_go_duration.substring(0, 2));
  var hours1_return = parseInt(tuple1_return_duration.substring(0, 2));
  var hours2_go = parseInt(tuple2_go_duration.substring(0, 2));
  var hours2_return = parseInt(tuple2_return_duration.substring(0, 2));

  var mins1_go = parseInt(tuple1_go_duration.substring(3, 5));
  var mins1_return = parseInt(tuple1_return_duration.substring(3, 5));
  var mins2_go = parseInt(tuple2_go_duration.substring(3, 5));
  var mins2_return = parseInt(tuple2_return_duration.substring(3, 5));

	if (hours1_go + hours1_return < hours2_go + hours2_return) {
		return -1;
	}
	if (hours1_go + hours1_return > hours2_go + hours2_return) {
		return 1;
	}
	if (mins1_go + mins1_return < mins2_go + mins2_return) {
    return -1;
  }
  if (mins1_go + mins1_return > mins2_go + mins2_return) {
    return 1;
  }
  return 0;
}

var airlineCmp = function(tuple1, tuple2) {
	var tuple1_airline = tuple1.go.outbound_routes[0].segments[0].airline.name;
	var tuple2_airline = tuple2.go.outbound_routes[0].segments[0].airline.name;

	if (tuple1_airline < tuple2_airline) {
		return -1;
	}
	else if (tuple1_airline > tuple2_airline) {
		return 1;
	}
	return 0;
}

function getTuples(data1, data2) {
	var tuples = [];
  	var counter = 0;
  	for (i = 0; i < data1.flights.length; i++) {
  		for (j = 0; j < data2.flights.length; j++) {
  			tuples[counter] = new Object();
  			tuples[counter].go = data1.flights[i];
  			tuples[counter].return = data2.flights[j];
  			counter ++;
  		}
  	}
  	return tuples;
}

function getValues() {
	var values = [];
  values[0] = $("#ascendant-flights-price-sort").prop("checked");
	values[1] = $("#descendant-flights-price-sort").prop("checked");
	values[2] = $("#ascendant-flights-duration-sort").prop("checked");
	values[3] = $("#descendant-flights-duration-sort").prop("checked");
	values[4] = $("#ascendant-flights-airline-sort").prop("checked");
	values[5] = $("#descendant-flights-airline-sort").prop("checked");
	return values;
}

function getComparators() {
	var comparators = [];
	comparators[0] = priceCmp;
	comparators[1] = durationCmp;
	comparators[2] = airlineCmp;
	return comparators;
}

function showSorts() {
	$("#flights-sort-box").show();

	$("#ascendant-flights-price-sort-div").show();
	$("#descendant-flights-price-sort-div").show();
	$("#ascendant-flights-duration-sort-div").show();
	$("#descendant-flights-duration-sort-div").show();
	$("#ascendant-flights-airline-sort-div").show();
	$("#descendant-flights-airline-sort-div").show();
}

function hideSorts() {
	$("#flights-sort-box").hide();

	$("#ascendant-flights-price-sort-div").hide();
	$("#descendant-flights-price-sort-div").hide();
	$("#ascendant-flights-duration-sort-div").hide();
	$("#descendant-flights-duration-sort-div").hide();
	$("#ascendant-flights-airline-sort-div").hide();
}

function changeTabs(id){
  if (id == undefined){
    $(".nav-tab-button").removeClass("box-elem-op");
  }else{
    $(".nav-tab-button").removeClass("box-elem-op");
    $(id).addClass("box-elem-op");
  }
}

function changeBreadCrumb(id){
  $("#breadcrumb-ol").show();
  $(".breadcrumb-item").removeClass("active");
  $(id).addClass("active");
}

function saveTextResults(object){
  sessionStorage.setItem("searchState",JSON.stringify(object));
}

function loadTextResults(){
  var object = JSON.parse(sessionStorage.getItem("searchState"));
  if (object == undefined){
    return;
  }
  document.forms["flights"]["origen-text-input"].value = object.source;
  document.forms["flights"]["destino-text-input"].value = object.destiny;
  document.forms["flights"]["date-salida"].value = object.departure_date;
  document.forms["flights"]["date-regreso"].value = object.return_date;
}

function localSearchButton(number){
  var deals = JSON.parse(sessionStorage.getItem("local_deals"));
  var save_form_data = {
    source: JSON.parse(sessionStorage.getItem("local_deal_city")),
    destiny: deals[number].city.name,
    departure_date: "",
    return_date: ""
  };
  saveTextResults(save_form_data);
  loadTextResults();
}


function showErrorGL(error) {
    switch(error.code) {
        case error.PERMISSION_DENIED:
            fillError("#unknown-error","Hubo un error al intentar encontrar su ubicación. Por favor, intente más tarde.");
            break;
        case error.POSITION_UNAVAILABLE:
            fillError("#unknown-error","Hubo un error al intentar encontrar su ubicación. Por favor, intente más tarde..");
            break;
        case error.TIMEOUT:
            fillError("#unknown-error","Hubo un error al intentar encontrar su ubicación. Por favor, intente más tarde.");
            break;
        case error.UNKNOWN_ERROR:
            fillError("#unknown-error","Hubo un error al intentar encontrar su ubicación. Por favor, intente más tarde.");
            break;
    }
}

function getPosition(position){
  sessionStorage.setItem("my_latitude",JSON.parse(position));
  sessionStorage.setItem("my_longitude",JSON.parse(position));
}

function parseCabin(cabin_type){
  if (cabin_type == "ECONOMY") {
    return "Económica";
  }
  else if (cabin_type = "BUSINESS") {
    return "Ejecutiva";
  }
  else {
    return "Primera clase";
  }
}

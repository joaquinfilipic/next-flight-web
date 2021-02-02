/* JQuery after-load functions */
/*$("document").ready(function() {

  $.ajaxSetup({
       cache: false
  });

  load_offers_objects(true);

}); */

function load_offers_objects(save_state){
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

  $('#modifiable-great-panel').ready(function(){
    if (save_state){
      savePageOfferState("Ofertas","ofertas.html","ofertas");
      return;
    }
  });
}

function offerForm(){

  $('#offers_2').empty();
  savePageOfferState("Ofertas","ofertas.html","ofertas_result")
  var source = document.forms["offer"]["origen-text-input"].value;
  var cities_req = getPlacesFromAPI(encodeURI(source));
  var offer_template = $.ajax({
          dataType: 'text',
          url: './offer_template_offerspage.html',
        });

        $(".alert").empty();
        $(".alert").hide();

    $.when(cities_req).done(function(data_cities,city_succ,city_err){
      if(data_cities.error != undefined){
        fillError("#unknown-error","Ahora no se pudo realizar la solicitud. Por favor, intentelo más tarde.");
        return;
      }
      var index_source = getIndex(data_cities.data,source);
      if (data_cities.data.length < 1 || index_source == -1){
        fillError("#wrong-origen","Por favor, elija una opción de la lista.");
        return;
      }
      $.when(offer_template).done(function(offer_template,suc_temp,error_temp){
          if(suc_temp != "success"){
            fillError("#unknown-error","Ahora no se pudo realizar la solicitud. Por favor, intentelo más tarde.");
            return;
          }

            if ( data_cities.data[index_source].name != undefined ) {
              orig = data_cities.data[index_source].name;
            } else {
              orig = data_cities.data[index_source].description;
            }
            var name = orig;
            var id = data_cities.data[index_source].id;

            var get_deals= getDeals(id);

            $.when(get_deals).done(function(data_request, suc_req,error_req){
              if(data_request == undefined || data_request.error != undefined){
                fillError("#unknown-error","Ahora no se pudo realizar la solicitud. Por favor, intentelo más tarde.");
                return;
              }
              sessionStorage.setItem("deal_city",JSON.stringify(name));
              sessionStorage.setItem("deals",JSON.stringify(data_request.deals));
              for (j = 0 ; j < data_request.deals.length ; j++ ){
                var longitude = data_request.deals[j].city.longitude;
                var latitude = data_request.deals[j].city.latitude;
                var options = {
                  Origen : name,
                  Destino: data_request.deals[j].city.name,
                  Precio: data_request.deals[j].price,
                  Number: j
                };
                var photos_request = getPhotosOffers(longitude,latitude,1,options,offer_template,j==data_request.deals.length-1);
              }

            });

          });
      });
}
/*
function offerForm(){
	$('#offers_2').empty();
  savePageOfferState("Ofertas","ofertas.html","ofertas_result")
  var source = document.forms["offer"]["origen-text-input"].value;
  var cities_req = getPlacesFromAPI(encodeURI(source));
  var offer_template = $.ajax({
          dataType: 'text',
          url: './offer_template_offerspage.html',
        });
  $.when(cities_req).done(function(data_cities,success,error){
    if(data_cities.error != undefined){
      fillError("#unknown-error","Ahora no se pudo realizar la solicitud. Por favor, intentelo más tarde.");
      return;
    }
    var index_source = getIndex(data_cities.data,source);
    if (data_cities.data.length < 1 || index_source == -1){
      fillError("#wrong-origen","Por favor, elija una opción de la lista.");
      return;
    }
    $.when(offer_template).done(function(offer_template,suc_temp,error_temp){
      if(suc_temp != "success"){
        fillError("#unknown-error","Ahora no se pudo realizar la solicitud. Por favor, intentelo más tarde.");
        return;
      }
      var request = [];

      var id = data_cities.data[i].id;
      var obj_request = {
        name : data_cities.data[i].name,
		    description : data_cities.data[i].description,
        request : getDeals(id)
      }
      request.push(obj_request);

      }

		for ( j = 0 ; j < request.length ; j++ ){
			$.when(request[j].request).done(function(data_request, suc_req,error_req){
            	if(data_request == undefined || data_request.error != undefined){
              		fillError("#unknown-error","Ahora no se pudo realizar la solicitud. Por favor, intentelo más tarde.");
              	return;
            	}
				for ( k = 0 ; k < data_request.deals.length ; k++ ) {
					var longitude = data_request.deals[k].city.longitude;
		            var latitude = data_request.deals[k].city.latitude;

					var orig;
					if ( request[j].name != undefined ) {
						orig = request[j].name;
					} else {
						orig = request[j].description;
					}

		            var options = {
		            	Origen : orig,
              			Destino: data_request.deals[k].city.name,
              			Precio: data_request.deals[k].price,
            		};
            		var photos_request = getPhotosOffers(longitude,latitude,1,options,offer_template,k==(data_request.length - 1));
				}

			});
		}
    });
  });
}
*/
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

var getPhotosOffers = function(long,lat,distance,options,offer_template,save_state){
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
      $('#offers_2').append(rendered);
      $('#offers_2').append("<div></div>");
	    $('#offers_2').append("<div></div>");
      if (save_state){
        $('#modifiable-great-panel').ready(function(){
          replacePageOfferState("Ofertas","ofertas.html","ofertas_result");
        });
      }
    });

}

function savePageOfferState(title,url,page_name){
  var data = {
    offer_html: $("#modifiable-great-panel").html(),
    last_url: ""+ window.location.pathname,
    page: page_name,
    offers: sessionStorage.getItem("deals"),
    deal_name: sessionStorage.getItem("deal_city")
  };
  history.pushState(data,title,url);
}

function replacePageOfferState(title,url,page_name){
  var data = {
    offer_html: $("#modifiable-great-panel").html(),
    last_url: ""+ window.location.pathname,
    page: page_name,
    offers: sessionStorage.getItem("deals"),
    deal_city: sessionStorage.getItem("deal_city")
  };
  history.replaceState(data,title,url);
}

function searchButton(number){
  var deals = JSON.parse(sessionStorage.getItem("deals"));
  var save_form_data = {
    source: JSON.parse(sessionStorage.getItem("deal_city")),
    destiny: deals[number].city.name,
    departure_date: "",
    return_date: ""
  };
  saveTextResults(save_form_data);
  homeButton();
}

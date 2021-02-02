/* JQuery after-load functions */

function load_items_detalle_compra(){
	$("form").submit(function(e) {
		e.preventDefault();
	});

	fillTemplates();
}

function load_detalle_compra(){
	var request_template = $.ajax({
		dataType: 'text',
		url: './template_detalle.html',
	});

	$.when(request_template).done(function(template_data){
		$('#modifiable-great-panel').html(template_data);
		$('#modifiable-great-panel').ready(function(){
			fillTemplates();
			/*$("form").submit(function(e) {
				e.preventDefault();
			});*/
		});
	});

}

function submitDetailForm() {
	var personal_data = JSON.parse(sessionStorage.getItem("personal_data"));
	var to_buy_flight = JSON.parse(sessionStorage.getItem("toBuyFlight"));
	var go_return = JSON.parse(sessionStorage.getItem("return"));
	var flight_data = JSON.parse(sessionStorage.getItem("flight_data_global"));

	$(".alert").empty();
	$(".alert").hide();
	//sessionStorage.setItem("toBuyFlight",JSON.stringify(flight));

	var options = new Object();
	var go_flight_id;
	var return_flight_id;
	if (go_return){
		go_flight_id = to_buy_flight.go.outbound_routes[0].segments[0].id;
		return_flight_id = to_buy_flight.return.outbound_routes[0].segments[0].id;
	}else{
		go_flight_id = to_buy_flight.outbound_routes[0].segments[0].id;
	}

		options.flight_id = go_flight_id;
		options.passengers = [];
		var passenger = {}
		for (i = 0; i < personal_data.passenger_names.length; i++) {
			options.passengers.push(passenger);
			options.passengers[i].first_name = personal_data.passenger_names[i];
			options.passengers[i].last_name = personal_data.passenger_surnames[i];
			options.passengers[i].birthdate = parseMyDate(personal_data.passenger_birth_dates[i]);
			if (personal_data.passenger_id_types[i] == "DNI"){
				options.passengers[i].id_type = 1;
			}else{
				options.passengers[i].id_type = 2;
			}
			options.passengers[i].id_number = personal_data.passenger_id_numbers[i];
		}
		options.payment = new Object();
		options.payment.installments = 1;
		options.payment.credit_card = {
			number: personal_data.card_number,
			expiration: personal_data.exp_date,
			security_code: personal_data.sec_code,
			first_name: personal_data.owner_name,
			last_name: personal_data.owner_surname
		};
		var billing_country_id = JSON.parse(sessionStorage.getItem("billing_country_id"));
		var billing_city_id = JSON.parse(sessionStorage.getItem("billing_city_id"));
		options.payment.billing_address = {
			city: {
				id: billing_city_id,
				state: personal_data.state,
				country: {
					id: billing_country_id
				}
			},
			zip_code: parseInt(personal_data.zip_code),
			street: personal_data.street,
			floor: personal_data.floor,
			apartment: personal_data.apartment
		};
		options.contact = {
			email: personal_data.email,
			phones: personal_data.phone_list
		};
		if (go_return){
			var options2 = JSON.parse(JSON.stringify(options));
			options2.flight_id = return_flight_id;
			var submit1 = $.ajax({
				//type: 'POST',
				//contentType: 'application/json; charset=utf-8',
				dataType: 'json',
				url: "http://hci.it.itba.edu.ar/v1/api/booking.groovy?method=bookflight2",
				data: {
					booking: encodeURIComponent(JSON.stringify(options)).replace(/%3A/g,':').replace(/%2C/g,',').replace(/%40/g,'@')
				},
			});
			var submit2 = $.ajax({
				//type: 'POST',
				//contentType: 'application/json; charset=utf-8',
				dataType: 'json',
				url: "http://hci.it.itba.edu.ar/v1/api/booking.groovy?method=bookflight2",
				data: {
					booking: encodeURIComponent(JSON.stringify(options2)).replace(/%3A/g,':').replace(/%2C/g,',').replace(/%40/g,'@')
				},
			});
			$.when(submit1,submit2).done(function(my_response1,my_response2){
					if (my_response1[0] != undefined && my_response1[0].error == undefined && my_response2[0].error == undefined ){
						fillError("#estado-compra","La compra ha finalizado exitosamente.");
						$("#detalle-modal-close").on( "click", function() {
							$('#detalle-modal').modal('hide');
							$('body').removeClass('modal-open');
							$('.modal-backdrop').remove();
							homeButton();
						});
					}else {
						fillError("#estado-compra","No se pudo realizar la operación, por favor, intente más tarde.");
					}
					$("#detalle-modal").modal();
			});
		}else{
			var submit1 = $.ajax({
				//type: 'POST',
				//contentType: 'application/json; charset=utf-8',
				dataType: 'json',
				url: "http://hci.it.itba.edu.ar/v1/api/booking.groovy?method=bookflight2",
				data: {
					booking: encodeURIComponent(JSON.stringify(options)).replace(/%3A/g,':').replace(/%2C/g,',').replace(/%40/g,'@')
				},
			});
			$.when(submit1).done(function(my_response){
					if (my_response.error == undefined ){
						fillError("#estado-compra","La compra ha finalizado exitosamente.");
						$("#detalle-modal-close").on( "click", function() {
							$('#detalle-modal').modal('hide');
							$('body').removeClass('modal-open');
							$('.modal-backdrop').remove();
							homeButton();
						});
					}else {
						fillError("#estado-compra","No se pudo realizar la operación, por favor, intente más tarde."));
					}
					$("#detalle-modal").modal();
			});
		}


}

function fillTemplates() {
	var personal_data = JSON.parse(sessionStorage.getItem("personal_data"));
	var to_buy_flight = JSON.parse(sessionStorage.getItem("toBuyFlight"));
	var go_return = JSON.parse(sessionStorage.getItem("return"));
	var flight_data = JSON.parse(sessionStorage.getItem("flight_data_global"));

	var adults = JSON.parse(flight_data.adults);
	var children = JSON.parse(flight_data.children);
	var infants = JSON.parse(flight_data.infants);
	var total_passengers = adults + children + infants;

	var adult_count = 0;
	var children_count = 0;
	var infant_count = 0;

	var request_template_pas = $.ajax({
		dataType: 'text',
		url: './detalle_pasajero_template.html',
	});
	$.when(request_template_pas).done(function(template_data,success,err) {
		for (i = 0; i < total_passengers; i++) {
			var passenger_type;
			var document_type;
			if (adults > 0) {
				adult_count +=1;
				adults = adults - 1;
				passenger_type = "Adulto";
				if (adults > 0) {
					passenger_type += " "+adult_count;
				}
			}
			else if (children > 0) {
				children_count += 1;
				children = children - 1;
				passenger_type = "Niño";
				if (children >= 0) {
					passenger_type += " "+children_count;
				}
			}
			else if (infants > 0) {
				infant_count += 1;
				infants = infants - 1;
				passenger_type = "Infante";
				if (infants >= 0) {
					passenger_type += " "+infant_count;
				}
			}
			if (personal_data.passenger_id_types[i] == 1) {
				document_type = "DNI";
			}
			else {
				document_type = "Pasaporte";
			}
			var request_template = $.ajax({
				dataType: 'text',
				url: './detalle_pasajero_template.html',
			});
			var options = {
				PasajeroTipo: passenger_type,
				PasajeroNombre: personal_data.passenger_names[i],
				PasajeroApellido: personal_data.passenger_surnames[i],
				PasajeroDocumentoTipo: personal_data.passenger_id_types[i],
				PasajeroDocumentoNumero: personal_data.passenger_id_numbers[i],
				PasajeroNacimiento: personal_data.passenger_birth_dates[i]
			};
			var rendered = Mustache.render(template_data, options);
			$('#detail-block').append(rendered);
		}
	});


	var request_template = $.ajax({
		dataType: 'text',
		url: './detalle_tarjeta_template.html',
	});
	$.when(request_template).done(function(template_data,success,err) {
		var options = {
			TitularNombre: personal_data.owner_name,
			TitularApellido: personal_data.owner_surname,
			TarjetaNumero: personal_data.card_number,
			TarjetaVencimiento: personal_data.exp_date,
			TarjetaCodigo: personal_data.sec_code
		};
		var rendered = Mustache.render(template_data, options);
		$('#detail-block').append(rendered);
	});

	var request_template2 = $.ajax({
		dataType: 'text',
		url: './detalle_facturacion_template.html',
	});

	$.when(request_template2).done(function(template_data,success,err) {
		var options = {
			FacturacionPais: personal_data.country,
			FacturacionEstado: personal_data.state,
			FacturacionCiudad: personal_data.city,
			FacturacionCodigoPostal: personal_data.zip_code,
			FacturacionCalle: personal_data.street,
			FacturacionNumero: personal_data.door_number,
		};
		if (personal_data.floor != undefined) {
			options.FacturacionPiso = personal_data.floor;
			options.FacturacionDepartamento = personal_data.apartment;
		}
		var rendered = Mustache.render(template_data, options);
		$('#detail-block').append(rendered);
	});

	var go_flight = to_buy_flight.go;
	var return_flight = to_buy_flight.return;

	var request_template3 = $.ajax({
		dataType: 'text',
		url: './detalle_precios_template.html',
	});
	$.when(request_template3).done(function(template_data,success,err) {
		var flight1;
		var flight2;
		if (go_flight == undefined) {
			flight1 = to_buy_flight;
		}
		else {
			flight1 = go_flight;
		}
		var total_fares = flight1.price.total.fare;
		var total_taxes = flight1.price.total.taxes;
		var total_charges = flight1.price.total.charges;
		var price_total = flight1.price.total.total;
		var price_adult = flight1.price.adults.base_fare;
		if (flight1.price.children == null) {
			var children_price = " - - -";
		}else{
			var children_price = flight1.price.children.base_fare;
		}
		if (flight1.price.children == null) {
			var infants_price = " - - -";
		}else{
			var infants_price = flight1.price.infants.base_fare;
		}
		if (go_flight != undefined) {
			flight2 = return_flight;
			total_fares += flight2.price.total.fare;
			total_fares = price_total.toFixed(2);

			total_taxes += flight2.price.total.taxes;
			total_taxes = price_total.toFixed(2);

			total_charges += flight2.price.total.charges;
			total_charges = price_total.toFixed(2);

			price_total += flight2.price.total.total;
			price_total = price_total.toFixed(2);
			price_adult += flight2.price.adults.base_fare;
			price_adult = price_adult.toFixed(2);
			if (flight2.price.children != null) {
				children_price += flight2.price.children.base_fare;
				children_price = children_price.toFixed(2);
			}
			if (flight2.price.infant != null) {
				infants_price += flight2.price.infants.base_fare;
				infants_price = infants_price.toFixed(2);
			}
		}
		var options = {
			TotalTarifas: total_fares,
			TotalImpuestos: total_taxes,
			TotalCargos: total_charges,
			PrecioFinal: price_total,
			Cantidad: total_passengers,
			PrecioAdulto: price_adult,
			PrecioNino: children_price,
			PrecioInfante: infants_price
		};
		var rendered = Mustache.render(template_data, options);
		$('#buy-flight-detail-block').append(rendered);
	});


	request_template = $.ajax({
		dataType: 'text',
		url: './detalle_vuelo_template.html',
	});
	$.when(request_template).done(function(template_data,success,err) {
		var flight;
		var reps = 2;
		var directions = ["IDA", "VUELTA"];
		var arrows = ["arrow-right", "arrow-left"];

		flight = go_flight;
		if (flight == undefined) {
			flight = to_buy_flight;
			reps = 1;
		}

		for (i = 0; i < reps; i++) {
			if (i == 1) {
				flight = return_flight;
			}
			var direction = directions[i];
			var arrow = arrows[i];
			var origin = flight.outbound_routes[0].segments[0].departure.airport.description;
			var destiny = flight.outbound_routes[0].segments[0].arrival.airport.description;
			var departure_time = flight.outbound_routes[0].segments[0].departure.date;
			var arrival_time = flight.outbound_routes[0].segments[0].arrival.date;
			var flight_number = flight.outbound_routes[0].segments[0].number;
			var flight_class = parseCabin(flight.outbound_routes[0].segments[0].cabin_type);
			var adult_price = flight.price.adults.base_fare;

			var options = {
				IdaBarraVuelta: direction,
				ArrowDirection: arrow,
				LugarOrigen: origin,
				LugarDestino: destiny,
				HoraPartida: departure_time,
				HoraLlegada: arrival_time,
				Numero: flight_number,
				Clase: flight_class,
				//PAdulto: adult_price
			};
			var rendered = Mustache.render(template_data, options);
			$('#buy-flight-detail-block').append(rendered);
		}
		$('#modifiable-great-panel').ready(function(){
			savePageState("DetalleCompra","index.html","detalle");
		});

	});
}

function parseMyDate(dateString){
	var d = new Date(dateString);
	return d.getFullYear() + "-" + (d.getMonth()+1) + "-" + d.getDate();
}

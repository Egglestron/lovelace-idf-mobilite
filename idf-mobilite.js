import {
    LitElement,
    html,
    css
  } from "https://unpkg.com/lit-element@2.0.1/lit-element.js?module";

class IDFMobiliteCard extends LitElement {
    static get properties() {
        return {
            hass: {},
            config: {},
        };
    }

    render() {
        if (!this.config || !this.hass) {
            return html``;
        }

        return html`
            <ha-card style="background-color:#516077;">
                <div class="card-content">
                    ${this.config.lineType === "RER"
                        ? this.createRERContent() : ""}
                    ${this.config.lineType === "BUS"
                        ? this.createBUSContent() : ""}
                </div>
            </ha-card>
        `;
    }

    createRERContent() {
        return html`
            <div>
                RER
            </div>
        `;
    }

    createBUSContent() {
        const lineDatas = this.hass.states[this.config.entity];
        const messagesList = this.hass.states[this.config.messages];
        if (!lineDatas && !lineDatas.attributes['Siri'].ServiceDelivery.StopMonitoringDelivery[0].ResponseTimestamp)
            return html``
        // Last update date
        const lastUpdateDate = new Date(Date.parse(lineDatas.attributes['Siri'].ServiceDelivery.StopMonitoringDelivery[0].ResponseTimestamp))
        const lastUpdateTime = (lastUpdateDate.getUTCHours() < 10 ? "0" + lastUpdateDate.getUTCHours() : lastUpdateDate.getUTCHours()) + ":" + (lastUpdateDate.getUTCMinutes() < 10 ? "0" + lastUpdateDate.getUTCMinutes() : lastUpdateDate.getUTCMinutes())
        // Station name (take the first stopPointName)
        const stationName = lineDatas.attributes['Siri'].ServiceDelivery.StopMonitoringDelivery[0].MonitoredStopVisit.length>0 ?
                                lineDatas.attributes['Siri'].ServiceDelivery.StopMonitoringDelivery[0].MonitoredStopVisit[0].MonitoredVehicleJourney.MonitoredCall.StopPointName[0].value
                                : "API ERROR"
        // Build Line/Time
        const buses = {};
        lineDatas.attributes['Siri'].ServiceDelivery.StopMonitoringDelivery[0].MonitoredStopVisit.forEach(stop => {
            if (stop.MonitoredVehicleJourney.MonitoredCall.ExpectedDepartureTime && stop.MonitoredVehicleJourney.MonitoredCall.DestinationDisplay.length >0) {
                var busLine = stop.MonitoredVehicleJourney.OperatorRef.value;
                // OCTAVE, PCCMOD, STAEL = Metro, KOWM=TRAM
                if (busLine.indexOf("SAE-BUS") > 0 || busLine.indexOf("SAE-TRAM") > 0 || busLine.indexOf("OCTAVE") > 0 || busLine.indexOf("PCCMOD") > 0 || busLine.indexOf("STAEL") > 0 || busLine.indexOf("KOVM") > 0) {
                    busLine = busLine.replace("KOVM_", "SAE-TRAM.")
                    const destinationName = stop.MonitoredVehicleJourney.MonitoredCall.DestinationDisplay[0].value
                    if (!buses[busLine])
                        buses[busLine] = {}
                    if (!buses[busLine][destinationName])
                        buses[busLine][destinationName] = []
                    buses[busLine][destinationName].push(Math.floor((new Date(Date.parse(stop.MonitoredVehicleJourney.MonitoredCall.ExpectedDepartureTime)) - Date.now()) / 1000 / 60))
                }
                else {
                    console.log("Ignoring line : " + busLine)
                }
            }
        });

        //Build messages
        const messages = {}
        if (messagesList && messagesList.attributes['Siri']) {
            const deliveryMessages = messagesList.attributes['Siri'].ServiceDelivery.GeneralMessageDelivery[0]
            deliveryMessages.InfoMessage.forEach(infoMessage => {
                if (!messages[infoMessage.InfoChannelRef.value])
                    messages[infoMessage.InfoChannelRef.value] = { messages: [] }
                messages[infoMessage.InfoChannelRef.value].messages.push(infoMessage.Content.Message[0].MessageText.value)
            })
        }
        return html`
            <div>
                <div class="bus-header">
                    <div class="bus-station-name">
                        ${stationName.endsWith("RER") > 0 ?
                                    html`<div class="bus-destination-name">${stationName.substring(0, stationName.indexOf("RER")).endsWith("-")? stationName.substring(0, stationName.indexOf("-RER")): stationName.substring(0, stationName.indexOf("RER"))}</div><div class="bus-destination-img"><img src="/local/lovelace-idf-mobilite/images/RER_white.png" class="bus-destination-image"/></div>`
                            : stationName.endsWith("Métro") > 0 ?
                                html`<div class="bus-destination-name">${stationName.substring(0, stationName.indexOf("Métro")).endsWith("-") ? stationName.substring(0, stationName.indexOf("-Métro")) : stationName.substring(0, stationName.indexOf("Métro"))}</div><div class="bus-destination-img"><img src="/local/lovelace-idf-mobilite/images/METRO_white.png" class="bus-destination-image"/></div>`
                                : stationName}
                    </div>
                    <div class="bus-last-update">
                        <div class="bus-last-update-time">
                            ${lastUpdateTime}
                        </div>
                        <div class="bus-last-update-text">
                            Dernière mise à jour
                        </div>
                    </div>
                </div>
                ${Object.keys(buses).sort(function(a, b) { return a.substring(a.lastIndexOf('.') + 1, a.length - 1) - b.substring(b.lastIndexOf('.') + 1, b.length - 1) }).map(bus => {
                    return html`
                        <div class="bus-line">
                            ${Object.keys(buses[bus]).map((destination, index) => {
                            return html`
                                <div class="bus-line-detail">
                                    <div class="bus-img">
                                        ${index === 0 ?
                                            html`<img src="/local/lovelace-idf-mobilite/images/${bus.indexOf("BUS") > 0 ? "bus" : bus.indexOf("TRAM") > 0 ? "tram" : "metro"}/${bus.substring(bus.lastIndexOf('.') + 1, bus.length - 1)}.png" alt="${bus.substring(bus.lastIndexOf('.') + 1, bus.length - 1)}" class="${bus.indexOf("BUS") > 0 ? "bus" : bus.indexOf("TRAM") > 0 ? "tram" : "metro"}-image"/>` : ""}
                                    </div>
                                    <div class="bus-destination">
                                        ${destination.indexOf("<RER>") > 0 ?
                                            html`<div class="bus-destination-name">${destination.substring(0, destination.indexOf("<RER>")).endsWith("-") ? destination.substring(0, destination.indexOf("-<RER>")) : destination.substring(0, destination.indexOf("<RER>"))}</div><div class="bus-destination-img"><img src="/local/lovelace-idf-mobilite/images/RER.png" class="bus-destination-image"/></div>`
                                            : destination.indexOf("<METRO>") > 0 ?
                                                html`<div class="bus-destination-name">${destination.substring(0, destination.indexOf("<METRO>")).endsWith("-")?destination.substring(0, destination.indexOf("-<METRO>")):destination.substring(0, destination.indexOf("<METRO>"))}</div><div class="bus-destination-img"><img src="/local/lovelace-idf-mobilite/images/METRO.png" class="bus-destination-image"/></div>`
                                                : destination}
                                    </div>
                                    <div class="bus-stop">
                                        <div class="bus-stop-value">
                                            ${buses[bus][destination][0] > 0 ?
                                                        buses[bus][destination][0] :
                                                        (buses[bus][destination][0] == 0 ? "A l'approche" : "A l'arrêt")
                                               }
                                        </div>
                                    </div>
                                    <div class="bus-stop">
                                        <div class="bus-stop-value">
                                            ${buses[bus][destination][1] ? (buses[bus][destination][1] > 0 ? buses[bus][destination][1] : "") : ""}
                                        </div>
                                    </div>
                                </div>
                            `
                            })}
                        </div>`
                })}
                <div class="message-div">
                    ${Object.keys(messages).length > 0 ?
                        html`<div class="message-div-text">
                            ${Object.keys(messages).map(key => {
                                var concatMessage = "";
                                messages[key].messages.forEach((message, index) => { concatMessage += message + (index< messages[key].messages.length-1 ? " /// ": "") })
                                if (key == "Perturbation")
                                    return html`<img src="/local/lovelace-idf-mobilite/images/warning.png" height="15px" style="align-self: center;">${concatMessage}`
                                else
                                    return concatMessage
                            })}</div>`
                        : ""}
                </div>
            </div>
        `;
    }

    setConfig(config) {
        if (!config.entity) {
            throw new Error("You need to define entities");
        }
        this.config = config;
    }

    // The height of your card. Home Assistant uses this to automatically
    // distribute all cards over the available columns.
    getCardSize() {
        return this.config.entities.length + 1;
    }

    static async getConfigElement() {
        await import("./idf-mobilite-card-editor.js");
        return document.createElement("idf-mobilite-card-editor");
    }

    static getStubConfig() {
        return {
            entities: "",
            lineType: "bus",
            line: "lineNumber",
            lineColor: "#676545",

        }
    }

    static get styles() {
        return css`
            .card-content {
                padding: 0px;
            }
            .bus-header {
                display: flex;
                justify-content: space-between;
                border-bottom: 4px solid #070572;
                background-color: #FFFFFF;
                border-radius: 10px 10px 0px 0px;
                margin-bottom: 4px;
            }
            .bus-station-name {
                display: flex;
                align-self: center;
                background-color: #070572;
                color: rgb(255, 255, 255);
                font-size: 18px;
                font-weight: bold;
                margin-left: 12px;
                padding: 4px 12px;
            }
            .bus-last-update {
                display: flex;
                flex-direction:column;
                margin-right: 12px;
            }
            .bus-last-update-time {
                display: flex;
                align-self: center;
                background: #000000;
                font-size: 18px;
                font-weight: bold;
                color: #CAA94C;
                padding: 2px 5px 5px 5px;
                border-radius: 0px 0px 5px 5px;
            }
            .bus-last-update-text {
                display: flex;
                font-size: 8px;
                color: #000000;
                margin-top: -2px;
            }
            .bus-line {
                display: flex;
                justify-content: space-between;
                flex-direction:column;
                margin: 4px 0px;
                background-color: #FFFFFF;
            }
            .bus-line-detail {
                display: flex;
                justify-content: space-between;
                border-bottom: 1px solid #516077;
                background-color: #FFFFFF;
                height:40px;
                padding-right: 10px;
            }
            .bus-img {
                display: flex;
                flex: 1;
                justify-content: center;
                align-items: center;
                min-width: 55px;
            }
            .bus-image {
                height: 25px;
            }
            .tram-image {
                height: 25px;
            }
            .metro-image {
                height: 30px;
            }
            .bus-destination {
                display: flex;
                flex: 6 ;
                align-self: center;
                color: #070572;
                font-size: 18px;
                font-weight: bold;
            }
            .bus-destination-name {
                display: flex;
                align-items: center;
            }
            .bus-destination-img {
                display: flex;
                flex: 1;
                align-items: center;
                margin-left: 5px;
            }
            .bus-destination-image {
                height: 20px;
            }
            .bus-stop {
                display: flex;
                flex: 1;
                align-self: center;
                justify-content: end;
            }
            .bus-stop-value {
                background: #000000;
                font-size: 18px;
                font-weight: bold;
                color: #CAA94C;
                padding: 2px 5px 5px 5px;
                border-radius: 5px;
                text-align: center;
                white-space: nowrap;
                min-width: 20px;
            }
            .message-div {
                display: flex;
                justify-content: center;
                overflow-x: auto;
                height: 20px;
                border-radius: 0px 0px 10px 10px;
                background-color: #FFFFFF;
                color: #000000;
                padding-left: 10px;
                padding-right: 10px;
                margin-top: 8px;
            }

            .message-div-text {
                display: flex;
                justify-content: right;
                flex-grow: 1;
                white-space: nowrap;
                animation: ScrollMessage 40s linear infinite;
            }

            @keyframes ScrollMessage {
                0% {
                    transform: translate(50%);
                }
                100% {
                    transform: translate(-60%);
                }

            }
        `;
    }

}
customElements.define("idf-mobilite-card", IDFMobiliteCard);
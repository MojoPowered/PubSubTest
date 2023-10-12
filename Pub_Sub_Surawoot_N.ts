//#region Interfaces
// interfaces
interface IEvent {
  type(): string;
  machineId(): string;
}


interface ISubscriber {
  handle(event: IEvent): void;
}

interface IPublishSubscribeService {
  publish (event: IEvent): void;
  subscribe (type: string, handler: ISubscriber): void;
  unsubscribe (type: string, handler: ISubscriber): void;
}
//#endregion

//type Maybe<T> = NonNullable<T> | undefined;


//#region Machines defines

// Machine Class
class Machine {
  public stockLevel = 5;
  public id: string;

  constructor (id: string) {
    this.id = id;
  }
}
//#endregion


//#region Event Classes
//Sale Event
class MachineSaleEvent implements IEvent {
  constructor(private readonly _sold: number, private readonly _machineId: string) {}

  machineId(): string {
    return this._machineId;
  }

  type(): string {
    return 'MachineSaleEvent';
  }
  
  getSoldQuantity(): number {
    return this._sold
  }
}

//Refill Event
class MachineRefillEvent implements IEvent {
  constructor(private readonly _refill: number, private readonly _machineId: string) {}

  machineId(): string {
    return this._machineId;
  }

  type(): string {
    return 'MachineRefillEvent';
  }
  
  getRefillQuantity(): number {
    return this._refill;
  }
}

//StockWarning Event 
class StockWarningEvent implements IEvent {
  constructor(private readonly _remain: number, private readonly _machineId: string) {}

  machineId(): string {
    return this._machineId;
  }

  type(): string {
    return 'StockWarningEvent';
  }
  
  getRemainQuantity(): number {
    return this._remain;
  }
}

//StockLevelOK Event 
class StockLevelOKEvent implements IEvent {
  constructor(private readonly _remain: number, private readonly _machineId: string) {}

  machineId(): string {
    return this._machineId;
  }

  type(): string {
    return 'StockLevelOKEvent';
  }
  
  getRemainQuantity(): number {
    return this._remain;
  }
}
//#endregion


//#region Publisher Class
// Implement IPublishSubscribeService
var subscribers: Map<string, ISubscriber> = new Map();
class PublishSubscribeService implements IPublishSubscribeService {
  subscribe(_eventType: string, _subscriber: ISubscriber): void {
    if (!subscribers.has(_eventType)) {
      //console.log("Subscribe => " + eventType + " count= " + subscribers.size);
      subscribers.set(_eventType, _subscriber);
    }
  }

  unsubscribe(_eventType: string, _subscriber: ISubscriber): void {
    if (subscribers.has(_eventType)) {
      subscribers.delete(_eventType);
    }
  }

  publish(_event: IEvent): void {
    console.log("publish => " + _event.machineId() + " " + _event.type() + " " + subscribers.size);
    const _subscriber = subscribers.get(_event.type());
    if (_subscriber) {
      //console.log("publishing...");
      _subscriber.handle(_event);
    }
  }
}
//#endregion

//#region Subscriber Classes
//Sale Subscriber
class MachineSaleSubscriber implements ISubscriber {
  private _machines: Machine[];
  private _publisher: IPublishSubscribeService;

  constructor (_machines: Machine[], _publisher: IPublishSubscribeService) {
    this._machines = _machines; 
    this._publisher = _publisher;
  }

  handle(_event: MachineSaleEvent): void {
    //console.log("MachineSaleEvent, MC Lenght= " + this._machines.length);
    var _targetMachine = this._machines.find(mc => mc.id === _event.machineId()) as Machine;
    var _publishAllowed = Boolean(_targetMachine.stockLevel >= 3 ? true : false);
    var _stock = _targetMachine.stockLevel -= _event.getSoldQuantity();
    
    console.log("MachineSaleEvent, " + _event.type() + ", " + _event.machineId() + ", Sold= " + _event.getSoldQuantity() + ", Stock Left= " + _stock + ", Pub Allowed= " + _publishAllowed);

    //Check condition for publishing
    if(_stock < 3 && _publishAllowed){
      //console.log("publishing StockWarningEvent...");
      this._publisher.publish(new StockWarningEvent(_stock, _event.machineId()));
    }
  }
}

//Refill Subscriber
class MachineRefillSubscriber implements ISubscriber {
  private _machines: Machine[];
  private _publisher: IPublishSubscribeService;

  constructor (_machines: Machine[], _publisher: IPublishSubscribeService) {
    this._machines = _machines; 
    this._publisher = _publisher;
  }

  handle(_event: MachineRefillEvent): void {
    var _targetMachine = this._machines.find(mc => mc.id === _event.machineId()) as Machine;
    var _publishAllowed = Boolean(_targetMachine.stockLevel < 3 ? true : false);
    var _stock = _targetMachine.stockLevel += _event.getRefillQuantity();
    
    console.log("MachineRefillEvent, " + _event.type() + ", " + _event.machineId() + ", Refill= " + _event.getRefillQuantity() + ", Stock Left= " + _stock + ", Pub Allowed= " + _publishAllowed);

    //Check condition for publishing
    if(_stock >= 3 && _publishAllowed){
      //console.log("publishing StockLevelOKEvent...");
      this._publisher.publish(new StockLevelOKEvent(_stock, _event.machineId()));
    }
  }
}

//Warning Subscriber
class StockWarningSubscriber implements ISubscriber {
   handle(_event: StockWarningEvent): void {
    console.log("StockWarningEvent, " + _event.type() + ", " + _event.machineId() + ", Stock Left= " + _event.getRemainQuantity())
  }
}

//StockOK Subscriber
class StockLevelOKSubscriber implements ISubscriber {
  handle(_event: StockLevelOKEvent): void {
    console.log("StockLevelOKEvent, " + _event.type() + ", " + _event.machineId() + ", Stock Left= " + _event.getRemainQuantity())
  }
}
//#endregion


//#region Functions 
const randomMachine = (): string => {
  const random = Math.random() * 3;
  if (random < 1) {
    return '001';
  } else if (random < 2) {
    return '002';
  }
  return '003';

}

const eventGenerator = (): IEvent => {
  const random = Math.random();
  if (random < 0.5) {
    const saleQty = Math.random() < 0.5 ? 3 : 5; // 1 or 2
    return new MachineSaleEvent(saleQty, randomMachine());
  } 
  else{
    const refillQty = Math.random() < 0.5 ? 3 : 5; // 3 or 5
    return new MachineRefillEvent(refillQty, randomMachine());
  }
}
//#endregion


// program
(async () => {
  console.log("Pub Sub Initial...");
  // create 3 machines with a quantity of 10 stock
  const machines: Machine[] = [ new Machine('001'), new Machine('002'), new Machine('003') ];

  // create the PubSub service
  //const pubSubService: IPublishSubscribeService = null as unknown as IPublishSubscribeService; // implement and fix this
  const pubSubService = new PublishSubscribeService();
  // create a machine sale event subscriber. inject the machines (all subscribers should do this)
  const saleSubscriber = new MachineSaleSubscriber(machines, pubSubService);
  const refillSubscriber = new MachineRefillSubscriber(machines, pubSubService);
  const warningSub = new StockWarningSubscriber();
  const stockOK = new StockLevelOKSubscriber();

  // subscribe to publisher
  console.log("Pub Sub Subscribing...");
  pubSubService.subscribe('MachineSaleEvent', saleSubscriber);
  pubSubService.subscribe('MachineRefillEvent', refillSubscriber);
  pubSubService.subscribe('StockWarningEvent', warningSub);
  pubSubService.subscribe('StockLevelOKEvent', stockOK);

  console.log("Pub Sub Generat Event.");
  // create 5 random events
  const events = [1,2,3,4,5,6,7,8,9].map(i => eventGenerator());
  
  console.log("Pub Sub Publising...");
  // publish the events
  events.map(pubSubService.publish);
  console.log("[Completed]");
})();
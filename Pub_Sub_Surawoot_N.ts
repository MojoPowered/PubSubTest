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

// Machine Repo Class
class MachineRepository {
  private _machines: Map<string, Machine> = new Map();

  addMachine(machine: Machine): void {
    this._machines.set(machine.id, machine);
  }

  getMachine(machineId: string): Machine | undefined {
  //getMachine<T extends unknown>(machineId: T): Maybe<T> {
    return this._machines.get(machineId);
  }
}

// Machine Class
class Machine {
  public stockLevel = 10;
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
  subscribe(eventType: string, subscriber: ISubscriber): void {
    if (!subscribers.has(eventType)) {
      console.log("Subscribe => " + eventType + " count= " + subscribers.size);
      subscribers.set(eventType, subscriber);
    }
  }

  unsubscribe(eventType: string, subscriber: ISubscriber): void {
    if (subscribers.has(eventType)) {
      subscribers.delete(eventType);
    }
  }

  publish(event: IEvent): void {
    console.log("publish => " + event.machineId() + " " + event.type() + " " + subscribers.size);
    const subscriber = subscribers.get(event.type());
    if (subscriber) {
      console.log("publishing...");
      subscriber.handle(event);
    }
  }
}
//#endregion

//#region Subscriber Classes
//Sale Subscriber
class MachineSaleSubscriber implements ISubscriber {
  private _machines: Machine[];
  private _publisher: IPublishSubscribeService;

  constructor (machines: Machine[], publisher: IPublishSubscribeService) {
    this._machines = machines; 
    this._publisher = publisher;
  }

  handle(event: MachineSaleEvent): void {
    //console.log("MachineSaleEvent, MC Lenght= " + this._machines.length);
    var publishRequired = Boolean(this._machines[Number(event.machineId())].stockLevel >= 3 ? true : false);
    var stock = this._machines[Number(event.machineId())].stockLevel -= event.getSoldQuantity();
    
    console.log("MachineSaleEvent, " + event.type() + ", " + event.machineId() + ", Sold= " + event.getSoldQuantity() + ", Stock Left= " + stock);

    //Check condition for publishing
    if(stock < 3 && publishRequired){
      this._publisher.publish(new StockWarningEvent(stock, event.machineId()));
    }
  }
}

//Refill Subscriber
class MachineRefillSubscriber implements ISubscriber {
  private _machines: Machine[];
  private _publisher: IPublishSubscribeService;

  constructor (machines: Machine[], publisher: IPublishSubscribeService) {
    this._machines = machines; 
    this._publisher = publisher;
  }

  handle(event: MachineRefillEvent): void {
    //console.log("MachineRefillEvent, MC ID= " + event.machineId() + ", refill= " + event.getRefillQuantity());
    var publishRequired = Boolean(this._machines[Number(event.machineId())].stockLevel < 3 ? true : false);
    var stock = this._machines[Number(event.machineId())].stockLevel += event.getRefillQuantity();
    
    console.log("MachineRefillEvent, " + event.type() + ", " + event.machineId() + ", Refill= " + event.getRefillQuantity() + ", Stock Left= " + stock);

    //Check condition for publishing
    if(stock >= 3 && publishRequired){
      this._publisher.publish(new StockLevelOKEvent(stock, event.machineId()));
    }
  }
}

//Warning Subscriber
class StockWarningSubscriber implements ISubscriber {
   handle(event: StockWarningEvent): void {
    console.log("StockWarningEvent, " + event.type() + ", " + event.machineId() + ", Stock Left= " + event.getRemainQuantity())
  }
}

//StockOK Subscriber
class StockLevelOKSubscriber implements ISubscriber {
  handle(event: StockLevelOKEvent): void {
    console.log("StockLevelOKEvent, " + event.type() + ", " + event.machineId() + ", Stock Left= " + event.getRemainQuantity())
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
    const saleQty = Math.random() < 0.5 ? 1 : 2; // 1 or 2
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

  console.log("Pub Sub Subscribing...");
  pubSubService.subscribe('MachineSaleEvent', saleSubscriber);
  pubSubService.subscribe('MachineRefillEvent', refillSubscriber);
  pubSubService.subscribe('StockWarningEvent', warningSub);
  pubSubService.subscribe('StockLevelOKEvent', stockOK);

  console.log("Pub Sub Generat Event.");
  // create 5 random events
  const events = [1,2].map(i => eventGenerator());
  
  console.log("Pub Sub Publising...");
  // publish the events
  events.map(pubSubService.publish);
  console.log("[Completed]");
})();
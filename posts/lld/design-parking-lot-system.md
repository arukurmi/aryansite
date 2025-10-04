---
title: "Design a Parking Lot System - Low Level Design"
excerpt: "Learn how to design a parking lot management system from scratch using object-oriented principles and design patterns."
date: "2024-01-15"
category: "lld"
tags: ["system-design", "object-oriented-design", "design-patterns", "parking-system"]
author: "Aryansh Kurmi"
---

# Design a Parking Lot System - Low Level Design

Designing a parking lot system is one of the most common system design questions asked in technical interviews. It tests your understanding of object-oriented design principles, design patterns, and real-world problem-solving skills.

## Problem Statement

Design a parking lot management system that can handle multiple parking spots, different vehicle types, and various operations like parking, unparking, and finding available spots.

## Core Requirements

1. **Vehicle Types**: Support different types of vehicles (Car, Motorcycle, Truck)
2. **Parking Spots**: Different spot types for different vehicles
3. **Operations**: Park, unpark, find available spots
4. **Pricing**: Different rates for different vehicle types
5. **Real-time Status**: Track which spots are occupied/available

## Class Design

### Vehicle Classes

```java
public abstract class Vehicle {
    protected String licensePlate;
    protected VehicleType type;
    protected int spotsNeeded;
    
    public Vehicle(String licensePlate, VehicleType type) {
        this.licensePlate = licensePlate;
        this.type = type;
    }
    
    public abstract boolean canFitInSpot(ParkingSpot spot);
    public abstract void print();
}

public class Car extends Vehicle {
    public Car(String licensePlate) {
        super(licensePlate, VehicleType.CAR);
        spotsNeeded = 1;
    }
    
    public boolean canFitInSpot(ParkingSpot spot) {
        return spot.getSize() == VehicleSize.COMPACT || 
               spot.getSize() == VehicleSize.LARGE;
    }
    
    public void print() {
        System.out.print("Car");
    }
}

public class Motorcycle extends Vehicle {
    public Motorcycle(String licensePlate) {
        super(licensePlate, VehicleType.MOTORCYCLE);
        spotsNeeded = 1;
    }
    
    public boolean canFitInSpot(ParkingSpot spot) {
        return true; // Can fit in any spot
    }
    
    public void print() {
        System.out.print("Motorcycle");
    }
}

public class Truck extends Vehicle {
    public Truck(String licensePlate) {
        super(licensePlate, VehicleType.TRUCK);
        spotsNeeded = 5;
    }
    
    public boolean canFitInSpot(ParkingSpot spot) {
        return spot.getSize() == VehicleSize.LARGE;
    }
    
    public void print() {
        System.out.print("Truck");
    }
}
```

### Parking Spot Class

```java
public class ParkingSpot {
    private Vehicle vehicle;
    private VehicleSize size;
    private int row;
    private int spotNumber;
    private Level level;
    
    public ParkingSpot(Level level, int row, int spotNumber, VehicleSize size) {
        this.level = level;
        this.row = row;
        this.spotNumber = spotNumber;
        this.size = size;
    }
    
    public boolean isAvailable() {
        return vehicle == null;
    }
    
    public boolean canFitVehicle(Vehicle vehicle) {
        return isAvailable() && vehicle.canFitInSpot(this);
    }
    
    public boolean park(Vehicle v) {
        if (!canFitVehicle(v)) {
            return false;
        }
        vehicle = v;
        return true;
    }
    
    public void removeVehicle() {
        vehicle = null;
    }
}
```

### Main ParkingLot Class

```java
public class ParkingLot {
    private Level[] levels;
    private int numberOfLevels;
    
    public ParkingLot(int numberOfLevels, int spotsPerLevel) {
        this.numberLevels = numberOfLevels;
        levels = new Level[numberOfLevels];
        
        for (int i = 0; i < numberOfLevels; i++) {
            levels[i] = new Level(i, spotsPerLevel);
        }
    }
    
    public boolean parkVehicle(Vehicle vehicle) {
        for (int i = 0; i < levels.length; i++) {
            if (levels[i].parkVehicle(vehicle)) {
                return true;
            }
        }
        return false;
    }
    
    public void removeVehicle(Vehicle vehicle) {
        for (int i = 0; i < levels.length; i++) {
            levels[i].removeVehicle(vehicle);
        }
    }
    
    public void print() {
        for (int i = 0; i < levels.length; i++) {
            System.out.print("Level " + i + ": ");
            levels[i].print();
            System.out.println("");
        }
        System.out.println("");
    }
}
```

## Key Design Patterns Used

### 1. **Strategy Pattern**
Used for different pricing strategies based on vehicle type and time duration.

### 2. **Observer Pattern**
For real-time notifications when spots become available or occupied.

### 3. **Factory Pattern**
For creating different types of vehicles and parking spots.

## Advanced Features

### Pricing System
```java
public interface PricingStrategy {
    double calculatePrice(Vehicle vehicle, long duration);
}

public class HourlyPricingStrategy implements PricingStrategy {
    private Map<VehicleType, Double> hourlyRates;
    
    public double calculatePrice(Vehicle vehicle, long duration) {
        double rate = hourlyRates.get(vehicle.getType());
        return rate * (duration / 3600000.0); // Convert to hours
    }
}
```

### Reservation System
```java
public class Reservation {
    private String reservationId;
    private Vehicle vehicle;
    private ParkingSpot spot;
    private Date startTime;
    private Date endTime;
    private ReservationStatus status;
}

public class ReservationManager {
    private Map<String, Reservation> reservations;
    
    public Reservation makeReservation(Vehicle vehicle, Date startTime, Date endTime) {
        // Implementation for making reservations
    }
}
```

## Testing Strategy

1. **Unit Tests**: Test individual classes and methods
2. **Integration Tests**: Test the interaction between components
3. **Performance Tests**: Test with large numbers of vehicles and spots
4. **Edge Cases**: Test boundary conditions and error scenarios

## Scalability Considerations

1. **Database Integration**: Store parking data in a database for persistence
2. **Caching**: Use Redis for frequently accessed data
3. **Microservices**: Split into separate services for different functionalities
4. **Real-time Updates**: Use WebSockets for live updates

## Common Interview Questions

1. How would you handle concurrent access to parking spots?
2. How would you implement a priority system for parking?
3. How would you handle payment processing?
4. How would you scale this system for multiple parking lots?

## Conclusion

This parking lot system design demonstrates the importance of:
- Clear separation of concerns
- Proper use of inheritance and polymorphism
- Design pattern implementation
- Scalability considerations
- Real-world problem-solving approach

The key is to start with the basic requirements and gradually add complexity while maintaining clean, maintainable code.

---

*This post covers the fundamental aspects of designing a parking lot system. In the next post, we'll explore more advanced features like payment processing and real-time monitoring.*

# Milestone 1

### Problematic

Initiated in 1950, Formula 1 stands as the pinnacle of motor sport, renowned for its prestige, widespread popularity and technical brilliance. Considered one of the most data-driven sports, modern Formula 1 cars have 300 sensors producing approximately 100,000 data points per second, accumulating [1.5 terabytes of data over the course of a race](https://www.forbes.com/sites/joelshapiro/2023/01/26/data-driven-at-200-mph-how-analytics-transforms-formula-one-racing/?sh=6f330cc639db). All this data is analyzed to inform everything from car design to racing strategy.

For this project, we aim to make F1 accessible to those with a novice to intermediate understanding of motor racing, who require a visual explanation to comprehend the intricacies of the sport. We will focus on visualizations that talk about not only the Driver’s statistics across seasons and grand prix races, but also look at other factors like circuits, tire strategies and point-systems.

More specifically, our project aims to provide visualisations for exploring the following:
1. Driver and teammate battles - how are two or more drivers comparing across races, qualifyings and seasons?
2. Circuit statistics - how many races have been held at a specific circuit? Which driver has had the most success there (wins, podiums, pole positions)?
3. GOAT-debate - who is the greatest driver of all time in pure numbers?
4. Environmental impact of race calendar - how could the race calendar be reorganized to minimize environmental impact/race travel mileage?
5. Point system - How would a different point system affect seasonal championship outcomes? 

### Dataset

We have decided to use the python package [FastF1](https://docs.fastf1.dev), built on the [Ergast API](http://ergast.com/mrd/) which provides a historical record of motor racing data for non-commercial purposes. The API provides access to detailed event data, session results, race control messages, track statuses, telemetry data and circuit information for Formula 1. The data is retrievable as either JSON-files or flattened Pandas dataframes, with values parsed appropriately to minimize the need for preprocessing. 

However, one limitation of the API is that it query only singular events. To overcome this, we have decided to rely on the Kaggle dataset ["Formula 1 World Championship (1950 - 2023)"](https://www.kaggle.com/datasets/rohanrao/formula-1-world-championship-1950-2020) which is essentially a concatenation of FastF1 data. This allows us explore historic trends without having to make one API call per race. Initial exploration uncovered missing data from the middle of 2023 onwards, which we plan to correct using FastF1. The dataset needs some cleaning and correct handling of columns (e.g datetime and laptime parsing).

Note: the Ergast API is deprecated and will shutdown by the end of 2024. Our testing confirms that functionalities are currently fully operational.

![Overview over the available data](/milestone1/img/fastf1.png)
**FastF1 Documentation:** *timing data, session information, car telemetry and position data are available from 2018 onwards. Schedule information and session results are available from 1950 onwards.*

### Exploratory Data Analysis

Our [.ipynb-notebook](/exploratory_analysis-milestone-1.ipynb) demonstrates our preprocessing steps and exploratory analysis of the Kaggle dataset. We provide some of the plots here, but more plots are available in the notebook.

![Drivers Per Season](/milestone1/img/milestone1-plots/stats_perSeasonDrivers.webp)

![Races Per Season](/milestone1/img/milestone1-plots/stats_perSeasonRaces.webp)

![Points Per Season](/milestone1/img/milestone1-plots/stats_perSeasonPoints.webp)

![DNFs Per Season](/milestone1/img/milestone1-plots/stats_perSeasonDNFs.webp)

![Common Causes of DNF](/milestone1/img/milestone1-plots/dist_causedOfDNF.webp)
    
![Debut Age](/milestone1/img/milestone1-plots/dist_histogramDebutAge.webp)

![Driver Nationalities](/milestone1/img/milestone1-plots/dist_pieTopDriversNationalities.webp)

![Race Evolution](/milestone1/img/milestone1-plots/testViz_raceEvolution2020.webp)

![Race Pace Comparison](/milestone1/img/milestone1-plots/testViz_racePaceComparison2020.webp)

![Selected Drivers Quali Comparison](/milestone1/img/milestone1-plots/testViz_selectedDriversAvgPosQualifying.webp)

![FastF1 Car Performance](/milestone1/img/milestone1-plots/fastf1_carPerformance2024.png)

![FastF1 Laptime Distribution](/milestone1/img/milestone1-plots/fastf1_laptimeDistributions2024.png)

![FastF1 Qualifying Telemetry](/milestone1/img/milestone1-plots/fastf1_teammateComparison2019.png)
*Qualifying Telemetry Data comparison between Ferrari team-mates Sebastian Vettel and Charles Leclerc (Monza 2019)*

### Related work
1. In [this](https://jasonjpaul.squarespace.com/formula-1-data-vis) website, Jason Paul outlines his process for understanding who is the greatest driver of all time, with a unique storytelling approach which acts as a choose-your-own-adventure structure for the user to click through.
2. [This](https://f1-visualization.vercel.app) website, developed by Yannick Gloster, allows the user to see the race in an interesting dynamic visualisation, but does not provide much more information.
3. [This](https://uxdesign.cc/visualizing-career-flows-in-sports-formula-1-3d88feca257c) visualisation is a static representation of the entire career of a particular team or a driver, designed by Ruban B.
4. [This](https://www.f1-tempo.com) website lets users create simple Formula 1 lap time and telemetry graphs utlizing data from [FastF1](https://github.com/theOehrly/Fast-F1/tree/master).

Our visualisation aims to be dynamic and interactive, while simultaneously guiding the user through the platform. While the visualisations should invite exploration, we also seek to present new insights regarding the impact(s) of point systems, race calendars and rule changes. While not an entirely novel topic, we aim to differentiate ourselves by bringing new perspectives through an interesting and interactive data story catering a broad audience.



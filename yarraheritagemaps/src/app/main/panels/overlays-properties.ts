
export interface Overlay {
    id: String;
    name: String;
}


export class OverlayProperties {
    Overlay: string = '';
    HeritagePlace: string = '';
    PaintControls: string = '';
    InternalControls: string = '';
    TreeControls: string = '';
    FenceControls: string = '';
    IncludedInVHR = false;
    Included: string = '';
    VHR: string = '';
    Image: string = '';
    Prohibited: string = '';
    AboriginalHeritagePlace: string = '';
    Status: string = '';
    Expiry: Date = new Date('1900/01/01');

    constructor(event: google.maps.Data.MouseEvent) {
        if (event && event.feature) {
            this.Overlay = event.feature.getProperty('Overlay');
            this.HeritagePlace = event.feature.getProperty('HeritagePlace');
            this.Included = event.feature.getProperty('Included');
            this.VHR = event.feature.getProperty('VHR');
            this.Image = event.feature.getProperty('Image');
            this.PaintControls = event.feature.getProperty('PaintControls');
            this.InternalControls = event.feature.getProperty('InternalControls');
            this.TreeControls = event.feature.getProperty('TreeControls');
            this.FenceControls = event.feature.getProperty('FenceControls');
            this.Prohibited = event.feature.getProperty('Prohibited');
            this.AboriginalHeritagePlace = event.feature.getProperty('AboriginalHeritagePlace');
            this.Status = event.feature.getProperty('Status');
            this.Expiry = event.feature.getProperty('Expiry');
        }
    }

    public setOverlayFromRows(row: Object) {
        if (row) {
            this.Overlay =  row['Overlay'];
            this.HeritagePlace = row['HeritagePlace'];
            this.Included = row['Included'];
            this.VHR = row['VHR'];
            this.Image = row['Image'];
            this.PaintControls = row['PaintControls'];
            this.InternalControls = row['InternalControls'];
            this.TreeControls = row['TreeControls'];
            this.FenceControls = row['FenceControls'];
            this.Prohibited = row['Prohibited'];
            this.AboriginalHeritagePlace = row['AboriginalHeritagePlace'];
            this.Status = row['Status'];
            this.Expiry = row['Expiry'];
        }
    }

    public heritagePlaceName() {
        const name = this.HeritagePlace.split('Incorporated plan')[0];
        return name ? name.trim() : '';
    }

    public incorporatedPlan() {
        const plan = this.HeritagePlace.split(': Incorporated Plan')[1];
        return plan ? plan.trim() : '';
    }

    public vhrLink() {
        return 'https://vhd.heritagecouncil.vic.gov.au/search?kw=' + this.VHR;
    }

}


